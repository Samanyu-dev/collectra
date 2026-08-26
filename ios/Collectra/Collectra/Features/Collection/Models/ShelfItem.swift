import Foundation

/// Mirrors one entry of `GET /api/v1/shelf/collection`'s `data.items`
/// (src/lib/collection/workspace.ts's `CollectionItem`, via the lean
/// `getShelfCollectionItems` — see that function's doc comment for why this
/// endpoint exists instead of the full `/api/v1/shelf` dashboard
/// aggregation, which the web `/shelf` page still uses unchanged). One tile
/// per owned variant; `quantity` folds in every physical copy.
struct ShelfItem: Decodable, Equatable, Identifiable {
    let variantId: String
    let cardId: String
    let cardName: String
    let cardNumber: String
    let setName: String
    let franchiseName: String
    let printingName: String?
    let parallelName: String?
    let isFoil: Bool
    let images: [MediaImage]
    let variantImages: [MediaImage]
    let scanMediaUrl: String?
    let quantity: Int
    let primaryInstanceId: String
    let createdAt: Date
    let condition: String
    let isGraded: Bool
    let isFavorite: Bool
    let price: PriceDisplay
    let purchasePrice: Double?
    let acquisitionSource: String
    let activeListingId: String?
    let isWishlisted: Bool

    var id: String { variantId }

    /// Grid-cell image — prefers the smaller THUMBNAIL variant at whichever
    /// level (variant-specific art, then card-level) actually has one.
    var primaryImageURL: URL? {
        variantImages.primaryImageURL(preferSmaller: true) ?? images.primaryImageURL(preferSmaller: true)
    }
}

/// Mirrors `GET /api/v1/shelf/collection`'s full `data` shape.
struct ShelfResponse: Decodable {
    let items: [ShelfItem]
}
