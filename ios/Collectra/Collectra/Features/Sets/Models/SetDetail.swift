import Foundation

/// Mirrors `GET /api/v1/sets/[id]`'s `data` shape
/// (src/app/api/v1/sets/[id]/route.ts) — header metadata only; the card grid
/// for this set comes from the existing `GET /api/v1/cards?setId=`.
struct SetDetail: Decodable, Equatable {
    let id: String
    let name: String
    let franchiseName: String
    let brandName: String
    let seriesName: String
    let imageUrl: String?
    let releaseDate: Date?
    let printedTotal: Int
    let ownedCount: Int
    let totalValueUsd: Double

    var imageURL: URL? {
        imageUrl.flatMap { URL(string: $0) }
    }

    var percentOwned: Double {
        printedTotal > 0 ? Double(ownedCount) / Double(printedTotal) : 0
    }
}
