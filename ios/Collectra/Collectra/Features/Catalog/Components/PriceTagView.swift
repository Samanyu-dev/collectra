import SwiftUI

/// Native counterpart to `PriceTag` (src/components/ui/price-tag.tsx) — same
/// rendering rules (never a bare number, never a fabricated ₹0/$0 when
/// `valueUsd` is null) and the same USD display convention the whole web app
/// already uses for `PriceDisplay` (Phase 4 requirement §7).
struct PriceTagView: View {
    let price: PriceDisplay
    var compact: Bool = false

    private var isDegraded: Bool { price.confidenceLabel == .low }

    private var confidenceDotColor: Color {
        switch price.confidenceLabel {
        case .high: return Color(hex: 0x4ADE80) // tailwind green-400
        case .medium: return Color(hex: 0xEAB308) // tailwind yellow-500
        case .low: return Color(hex: 0xF97316) // tailwind orange-500
        case .noData, .unknown: return Theme.Color_.foreground.opacity(0.2)
        }
    }

    private var confidenceLabelText: String {
        switch price.confidenceLabel {
        case .high: return "High"
        case .medium: return "Medium"
        case .low: return "Low"
        case .noData, .unknown: return "No data"
        }
    }

    var body: some View {
        if let value = price.valueUsd {
            if compact {
                compactBody(value: value)
            } else {
                fullBody(value: value)
            }
        } else {
            unavailableBody
        }
    }

    private var unavailableBody: some View {
        Group {
            if compact {
                Text("No data")
                    .font(Theme.Typography.body(10))
                    .italic()
                    .foregroundStyle(Theme.Color_.textTertiary)
            } else {
                Label("Price not yet available", systemImage: "exclamationmark.circle")
                    .font(Theme.Typography.body(14))
                    .foregroundStyle(Theme.Color_.textSecondary)
            }
        }
    }

    private func compactBody(value: Double) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(confidenceDotColor)
                .frame(width: 6, height: 6)
            Text(value, format: .currency(code: "USD"))
                .font(Theme.Typography.mono(11, weight: .semibold))
                .foregroundStyle(isDegraded ? Theme.Color_.textSecondary : Color(hex: 0x4ADE80))
            if let trend = price.trend30dPercent {
                TrendBadgeView(percent: trend, compact: true)
            }
        }
    }

    private func fullBody(value: Double) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            VStack(alignment: .leading, spacing: 4) {
                Text("CURRENT ESTIMATE")
                    .font(Theme.Typography.body(11, weight: .semibold))
                    .foregroundStyle(Theme.Color_.textTertiary)
                    .tracking(1)
                HStack(alignment: .firstTextBaseline, spacing: Theme.Spacing.sm) {
                    Text(value, format: .currency(code: "USD"))
                        .font(Theme.Typography.display(30))
                        .foregroundStyle(isDegraded ? Theme.Color_.textSecondary : Theme.Color_.foreground)
                    if let trend = price.trend30dPercent {
                        TrendBadgeView(percent: trend, compact: false)
                    }
                }
            }

            if let low = price.lowUsd, let high = price.highUsd, high > low {
                MarketRangeBar(low: low, high: high, value: value)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    HStack(spacing: 6) {
                        Circle().fill(confidenceDotColor).frame(width: 6, height: 6)
                        Text("Confidence: \(confidenceLabelText)")
                    }
                    Spacer()
                    Text("Based on \(price.observationCount) sale\(price.observationCount == 1 ? "" : "s")")
                }
                .font(Theme.Typography.body(12))
                .foregroundStyle(Theme.Color_.textSecondary)
                .padding(.top, Theme.Spacing.sm)
                .overlay(alignment: .top) {
                    Rectangle().fill(Theme.Color_.border).frame(height: 1)
                }

                Text(updatedLine)
                    .font(Theme.Typography.body(11))
                    .foregroundStyle(Theme.Color_.textTertiary)
            }
        }
    }

    private var updatedLine: String {
        var line = "Updated \(timeAgo(price.lastUpdated))"
        if !price.sources.isEmpty {
            line += " · \(price.sources.joined(separator: ", "))"
        }
        return line
    }

    private func timeAgo(_ date: Date?) -> String {
        guard let date else { return "never" }
        let minutes = Int(Date().timeIntervalSince(date) / 60)
        if minutes < 1 { return "just now" }
        if minutes < 60 { return "\(minutes)m ago" }
        let hours = minutes / 60
        if hours < 48 { return "\(hours)h ago" }
        return "\(hours / 24)d ago"
    }
}

private struct TrendBadgeView: View {
    let percent: Double
    let compact: Bool

    private var isFlat: Bool { abs(percent) < 1 }
    private var isUp: Bool { percent > 0 }

    private var color: Color {
        if isFlat { return Theme.Color_.textTertiary }
        return isUp ? Color(hex: 0x34D399) : Color(hex: 0xF87171)
    }

    var body: some View {
        HStack(spacing: 2) {
            if !isFlat {
                Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
                    .font(.system(size: compact ? 9 : 11, weight: .bold))
            }
            Text(isFlat ? "flat" : "\(isUp ? "+" : "")\(percent.formatted(.number.precision(.fractionLength(1))))%")
        }
        .font(Theme.Typography.mono(compact ? 10 : 13))
        .foregroundStyle(color)
    }
}

/// Native counterpart to `RangeBar` in price-tag.tsx.
private struct MarketRangeBar: View {
    let low: Double
    let high: Double
    let value: Double

    private var markerPercent: CGFloat {
        let span = high - low
        guard span > 0 else { return 0.5 }
        return CGFloat(min(1, max(0, (value - low) / span)))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("MARKET RANGE")
                .font(Theme.Typography.body(10, weight: .semibold))
                .foregroundStyle(Theme.Color_.textTertiary)
                .tracking(1)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.Color_.border).frame(height: 4)
                    Circle()
                        .fill(Theme.Color_.foreground)
                        .frame(width: 10, height: 10)
                        .offset(x: geo.size.width * markerPercent - 5)
                }
            }
            .frame(height: 10)

            HStack {
                rangeColumn(label: "Low", value: low)
                Spacer()
                rangeColumn(label: "Median", value: value, emphasized: true)
                Spacer()
                rangeColumn(label: "High", value: high)
            }
        }
    }

    private func rangeColumn(label: String, value: Double, emphasized: Bool = false) -> some View {
        VStack(spacing: 2) {
            Text(label.uppercased())
                .font(Theme.Typography.body(9))
                .foregroundStyle(Theme.Color_.textTertiary)
            Text(value, format: .currency(code: "USD"))
                .font(Theme.Typography.mono(13))
                .foregroundStyle(emphasized ? Theme.Color_.foreground : Theme.Color_.textSecondary)
        }
    }
}
