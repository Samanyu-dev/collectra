import Foundation

/// Mirrors one item of `GET /api/v1/cards`'s `data.items`
/// (src/app/api/v1/cards/route.ts) — the catalog browse/search row. Does not
/// include a `rarity` field: neither `Card` nor `Variant` carries one in the
/// current schema (checked prisma/schema.prisma), so the API genuinely
/// doesn't return it today — this is not an oversight in this model.
struct CardSummary: Decodable, Equatable, Identifiable, Hashable {
    let id: String
    let name: String
    let number: String
    let setId: String
    let setName: String
    let franchiseName: String
    let images: [MediaImage]
    let price: PriceDisplay
    let ownedQuantity: Int

    var primaryImageURL: URL? {
        images.first.flatMap { URL(string: $0.url) }
    }

    static func == (lhs: CardSummary, rhs: CardSummary) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

/// Mirrors `GET /api/v1/cards`'s full `data` shape.
struct CardListResponse: Decodable {
    let items: [CardSummary]
    let pagination: PaginationMeta
}
