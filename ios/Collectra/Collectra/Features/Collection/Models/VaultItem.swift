import Foundation

/// Mirrors one entry of `GET /api/v1/vault`'s `data.items`
/// (src/app/api/v1/vault/route.ts) — the user's vaulted instances, distinct
/// from Shelf: `isVaulted` is a per-Instance flag, separate from ownership
/// (Shelf) and wishlist state entirely (Phase 5 requirement §8).
struct VaultItem: Decodable, Equatable, Identifiable {
    struct Certification: Decodable, Equatable {
        let company: String
        let grade: String
    }

    let instanceId: String
    let cardId: String
    let variantId: String
    let name: String
    let franchiseName: String
    let setName: String
    let images: [MediaImage]
    let estimatedValue: Double
    let purchaseDate: Date?
    let notes: String?
    let isFavorite: Bool
    let certification: Certification?

    var id: String { instanceId }

    var primaryImageURL: URL? {
        images.first.flatMap { URL(string: $0.url) }
    }
}

/// Mirrors `GET /api/v1/vault`'s full `data` shape.
struct VaultResponse: Decodable {
    let items: [VaultItem]
    let totalVaultValue: Double
}
