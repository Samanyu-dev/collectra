import Foundation

/// Mirrors `PriceDisplay` (src/lib/pricing/types.ts) — the one shape every
/// `/api/v1` route uses to describe a price, never hand-assembled per screen.
/// Shared across Catalog (Phase 4) and future Shelf/Vault (Phase 5), so it
/// lives with the other cross-feature networking models rather than inside
/// Features/Catalog.
struct PriceDisplay: Decodable, Equatable {
    enum ConfidenceLabel: String, Decodable, Equatable {
        case high = "HIGH"
        case medium = "MEDIUM"
        case low = "LOW"
        case noData = "NO_DATA"
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = ConfidenceLabel(rawValue: raw) ?? .unknown
        }
    }

    let valueUsd: Double?
    let confidenceLabel: ConfidenceLabel
    let observationCount: Int
    let lastUpdated: Date?
    let sources: [String]
    let trend30dPercent: Double?
    let lowUsd: Double?
    let highUsd: Double?
    let soldAverageUsd: Double?

    /// `false` when the backend has no market data at all (`NO_DATA`) —
    /// callers must show "pricing unavailable" rather than a fabricated
    /// value/₹0 in this case (Phase 4 requirement §7).
    var hasValue: Bool { valueUsd != nil }
}
