import Foundation

/// Mirrors `PriceHistoryPoint` (src/lib/pricing/history.ts) — one raw
/// LISTING or SOLD observation. Never fabricated client-side; an empty
/// `points` array means "no history exists", shown as an empty state, not
/// synthesized.
struct PriceHistoryPoint: Decodable, Equatable, Identifiable {
    let date: Date
    let priceUsd: Double
    let source: String
    let kind: String

    var id: String { "\(date.timeIntervalSince1970)-\(source)-\(kind)" }
}

/// Mirrors `PriceHistoryResult` — ungraded listing/sold observations for one
/// variant, over the backend's default 90-day window.
struct PriceHistoryResult: Decodable, Equatable {
    let points: [PriceHistoryPoint]
    let trend: String
    let trendPercent: Double?
    let lowestPrice: Double?
    let highestPrice: Double?
    let averagePrice: Double?
    let lastUpdated: Date?
    let observationCount: Int
}
