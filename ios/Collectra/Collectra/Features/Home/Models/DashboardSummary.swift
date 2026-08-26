import Foundation
import SwiftUI

/// Mirrors `GET /api/v1/dashboard`'s `data` shape
/// (src/app/api/v1/dashboard/route.ts) — the lean mobile subset of the web
/// dashboard (see that route's doc comment for why it's not the full
/// `DashboardData`).
struct DashboardSummary: Decodable, Equatable {
    struct ChangeToday: Decodable, Equatable {
        let valueUsd: Double
        let changeAbs: Double
        let changePercent: Double?
        let pricedCardCount: Int
    }

    struct TopValuableCard: Decodable, Equatable, Identifiable {
        let variantId: String
        let cardId: String
        let cardName: String
        let cardNumber: String
        let setName: String
        let franchiseName: String
        let imageUrl: String?
        let marketPriceUsd: Double
        let cardType: String
        let rarityTier: String
        let sparkline: [Double]?

        var id: String { variantId }

        var imageURL: URL? {
            imageUrl.flatMap { URL(string: $0) }
        }

        /// Best-effort mapping from the dashboard's 5-tier rarity signal
        /// (src/lib/collection/classification.ts's `RarityTier`, computed
        /// from variant flags — not the base-card rarity `CardCell`'s doc
        /// comment says the schema doesn't have) onto the existing Theme
        /// rarity ramp. Unknown values fall back to `textTertiary` rather
        /// than guessing.
        @MainActor
        var rarityColor: Color {
            switch rarityTier {
            case "unique": return Theme.Color_.raritySecret
            case "legendary": return Theme.Color_.rarityHyper
            case "epic": return Theme.Color_.rarityUltra
            case "rare": return Theme.Color_.rarityRare
            case "common": return Theme.Color_.rarityCommon
            default: return Theme.Color_.textTertiary
            }
        }
    }

    struct ActivityEntry: Decodable, Equatable, Identifiable {
        let type: String
        let setName: String?
        let count: Int
        let latestTimestamp: Date

        var id: String { "\(type)-\(setName ?? "")-\(latestTimestamp.timeIntervalSince1970)" }

        /// "Added" / "Removed" / etc. from the `Event.type` vocabulary
        /// (CARD_ADDED, CARD_REMOVED, ...) — title-cased first word, good
        /// enough for a compact activity row without a full lookup table.
        var actionLabel: String {
            let word = type.split(separator: "_").last.map(String.init) ?? type
            return word.capitalized
        }
    }

    let portfolioValueUsd: Double
    let changeToday: ChangeToday?
    let topOwnedValuable: [TopValuableCard]
    let recentActivity: [ActivityEntry]
    let wishlistCount: Int

    var isEmpty: Bool {
        portfolioValueUsd == 0 && topOwnedValuable.isEmpty && recentActivity.isEmpty
    }
}
