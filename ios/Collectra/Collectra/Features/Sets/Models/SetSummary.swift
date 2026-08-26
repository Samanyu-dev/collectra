import Foundation

/// Mirrors one item of `GET /api/v1/sets`'s `data.items`
/// (src/app/api/v1/sets/route.ts) — the sets browse row.
struct SetSummary: Decodable, Equatable, Identifiable, Hashable {
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

    static func == (lhs: SetSummary, rhs: SetSummary) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

/// Mirrors `GET /api/v1/sets`'s full `data` shape.
struct SetListResponse: Decodable {
    let items: [SetSummary]
    let pagination: PaginationMeta
}
