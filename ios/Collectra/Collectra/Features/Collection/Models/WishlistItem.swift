import Foundation

/// Mirrors one entry of `GET /api/v1/wishlist`'s `data.items`
/// (src/app/api/v1/wishlist/route.ts) — card-level, not instance/variant
/// scoped (Phase 5 requirement §9: wishlist toggles use the card id).
struct WishlistItem: Decodable, Equatable, Identifiable {
    let id: String
    let cardId: String
    let name: String
    let number: String
    let setName: String
    let priceAlert: Double?
    let addedAt: Date
    let images: [MediaImage]
    let price: PriceDisplay
    let alertTriggered: Bool

    var primaryImageURL: URL? {
        images.first.flatMap { URL(string: $0.url) }
    }
}

/// Mirrors `GET /api/v1/wishlist`'s full `data` shape.
struct WishlistResponse: Decodable {
    let items: [WishlistItem]
}
