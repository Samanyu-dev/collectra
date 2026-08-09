import SwiftUI
import Charts

/// Native Swift Charts counterpart to `price-history-chart.tsx` /
/// `graded-price-history-chart.tsx` — one chart, switchable between the
/// ungraded series and any graded (company, grade) series the API actually
/// returned, so it's always clear which series is on screen (Phase 4
/// requirement §8). Never fabricates points: a series with fewer than 2 real
/// observations renders the empty state rather than an invented line — a
/// single point can't show a trend, and interpolating between it and nothing
/// would be exactly the kind of fabrication the API's own history helpers
/// (src/lib/pricing/history.ts) deliberately avoid.
struct PriceHistoryChartView: View {
    let priceHistory: PriceHistoryResult?
    let gradedPriceHistory: GradedPriceHistoryResult?

    private struct ChartPoint: Identifiable {
        let id = UUID()
        let date: Date
        let price: Double
    }

    private struct SeriesOption: Identifiable, Hashable {
        let id: String
        let label: String
    }

    @State private var selectedSeriesId: String = "ungraded"

    private var options: [SeriesOption] {
        var result: [SeriesOption] = []
        if let priceHistory, priceHistory.points.count >= 2 {
            result.append(SeriesOption(id: "ungraded", label: "Ungraded"))
        }
        for series in gradedPriceHistory?.series ?? [] where series.points.count >= 2 {
            result.append(SeriesOption(id: series.id, label: series.label))
        }
        return result
    }

    private var selectedPoints: [ChartPoint] {
        if selectedSeriesId == "ungraded" {
            return (priceHistory?.points ?? []).map { ChartPoint(date: $0.date, price: $0.priceUsd) }
        }
        guard let series = gradedPriceHistory?.series.first(where: { $0.id == selectedSeriesId }) else { return [] }
        return series.points.map { ChartPoint(date: $0.date, price: $0.priceUsd) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            header
            if selectedPoints.count >= 2 {
                chart
            } else {
                emptyState
            }
        }
        .onAppear { ensureValidSelection() }
        .onChange(of: options) { _, _ in ensureValidSelection() }
    }

    private var header: some View {
        HStack {
            Text("PRICE HISTORY")
                .font(Theme.Typography.body(11, weight: .semibold))
                .foregroundStyle(Theme.Color_.textTertiary)
                .tracking(1)
            Spacer()
            // Only shown with more than one real series — makes which
            // series is on screen explicit rather than implicit, and stays
            // out of the way entirely when there's nothing to switch between.
            if options.count > 1 {
                Menu {
                    ForEach(options) { option in
                        Button(option.label) { selectedSeriesId = option.id }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(currentLabel)
                        Image(systemName: "chevron.down")
                    }
                    .font(Theme.Typography.body(12, weight: .semibold))
                    .foregroundStyle(Theme.Color_.foreground)
                }
            } else if let only = options.first {
                Text(only.label)
                    .font(Theme.Typography.body(12, weight: .semibold))
                    .foregroundStyle(Theme.Color_.textSecondary)
            }
        }
    }

    private var currentLabel: String {
        options.first(where: { $0.id == selectedSeriesId })?.label ?? "—"
    }

    private func ensureValidSelection() {
        if !options.contains(where: { $0.id == selectedSeriesId }) {
            selectedSeriesId = options.first?.id ?? "ungraded"
        }
    }

    private var chart: some View {
        Chart(selectedPoints) { point in
            AreaMark(x: .value("Date", point.date), y: .value("Price", point.price))
                .interpolationMethod(.monotone)
                .foregroundStyle(
                    .linearGradient(
                        colors: [Theme.Color_.foreground.opacity(0.18), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            LineMark(x: .value("Date", point.date), y: .value("Price", point.price))
                .interpolationMethod(.monotone)
                .foregroundStyle(Theme.Color_.foreground)
            PointMark(x: .value("Date", point.date), y: .value("Price", point.price))
                .foregroundStyle(Theme.Color_.foreground)
                .symbolSize(18)
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisGridLine().foregroundStyle(Theme.Color_.border)
                AxisValueLabel {
                    if let price = value.as(Double.self) {
                        Text(price, format: .currency(code: "USD").precision(.fractionLength(0)))
                            .font(Theme.Typography.body(10))
                            .foregroundStyle(Theme.Color_.textTertiary)
                    }
                }
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine().foregroundStyle(Theme.Color_.border)
                AxisValueLabel(format: .dateTime.month(.abbreviated).day(), centered: true)
                    .font(Theme.Typography.body(10))
                    .foregroundStyle(Theme.Color_.textTertiary)
            }
        }
        .frame(height: 180)
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 24))
                .foregroundStyle(Theme.Color_.textTertiary)
            Text("Not enough price history yet")
                .font(Theme.Typography.body(13))
                .foregroundStyle(Theme.Color_.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 140)
    }
}
