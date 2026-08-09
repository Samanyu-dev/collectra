import Foundation

/// Mirrors `GradedPricePoint`/`GradedSeries`/`GradedPriceHistoryResult`
/// (src/lib/pricing/graded-history.ts) — one series per (grading company,
/// grade), e.g. "PSA 10". `companies` is data-driven (never a hardcoded
/// PSA/BGS/CGC list), matching the web reference implementation.
struct GradedPricePoint: Decodable, Equatable, Identifiable {
    let date: Date
    let priceUsd: Double

    var id: TimeInterval { date.timeIntervalSince1970 }
}

struct GradedSeries: Decodable, Equatable, Identifiable {
    let company: String
    let grade: String
    let label: String
    let points: [GradedPricePoint]
    let latestPriceUsd: Double?

    var id: String { "\(company)::\(grade)" }
}

struct GradedPriceHistoryResult: Decodable, Equatable {
    let companies: [String]
    let series: [GradedSeries]
    let observationCount: Int
    let lastUpdated: Date?
}
