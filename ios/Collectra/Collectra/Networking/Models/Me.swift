import Foundation

/// Matches `GET /api/v1/me`'s `data` shape (src/app/api/v1/me/route.ts) — one
/// Codable struct per endpoint response, kept next to APIClient rather than
/// scattered into feature folders, since this one (unlike future
/// Catalog/Shelf models) is used by the core auth/profile flow this phase owns.
struct Me: Decodable {
    struct CollectionSummary: Decodable {
        let totalCards: Int
        let uniqueCards: Int
        let favoriteCount: Int
        let vaultedCount: Int
        let wishlistCount: Int
    }

    let id: String
    let email: String
    let name: String?
    let username: String?
    let avatarUrl: String?
    let collectionSummary: CollectionSummary
}
