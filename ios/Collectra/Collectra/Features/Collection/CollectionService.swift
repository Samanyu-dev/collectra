import Foundation

/// Abstraction over every collection read/mutation this app performs —
/// Shelf/Vault/Wishlist fetches plus quantity/favorite/vault/wishlist
/// mutations — behind one `Sendable` protocol, mirroring Phase 4's
/// `CatalogServicing`/`CardDetailServicing` pattern (View → ViewModel →
/// Collection Service → APIClient → `/api/v1`; no feature gets a second
/// networking layer). Lets view models be unit-tested against a fake
/// without hitting the network.
protocol CollectionServicing: Sendable {
    func fetchShelf() async throws -> [ShelfItem]
    func fetchVault() async throws -> VaultResponse
    func fetchWishlist() async throws -> [WishlistItem]
    func setQuantity(cardId: String, variantId: String, action: QuantityAction) async throws -> Int
    func toggleFavorite(instanceId: String) async throws -> FavoriteResponse
    func toggleVault(instanceId: String) async throws -> VaultToggleResponse
    func toggleWishlist(cardId: String) async throws -> Bool
}

/// Talks to the real `/api/v1` collection endpoints. The only place that
/// knows these routes/request shapes. Shelf reads go through the lean
/// `/api/v1/shelf/collection` (Phase 5 addition — see its route doc
/// comment), not the full dashboard-aggregation `/api/v1/shelf`.
struct CollectionService: CollectionServicing {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchShelf() async throws -> [ShelfItem] {
        let response: ShelfResponse = try await client.get("/api/v1/shelf/collection")
        return response.items
    }

    func fetchVault() async throws -> VaultResponse {
        try await client.get("/api/v1/vault")
    }

    func fetchWishlist() async throws -> [WishlistItem] {
        let response: WishlistResponse = try await client.get("/api/v1/wishlist")
        return response.items
    }

    func setQuantity(cardId: String, variantId: String, action: QuantityAction) async throws -> Int {
        let response: QuantityResponse = try await client.post(
            "/api/v1/cards/\(cardId)/variants/\(variantId)/quantity",
            body: QuantityRequest(action: action)
        )
        return response.quantity
    }

    func toggleFavorite(instanceId: String) async throws -> FavoriteResponse {
        try await client.post("/api/v1/instances/\(instanceId)/favorite")
    }

    func toggleVault(instanceId: String) async throws -> VaultToggleResponse {
        try await client.post("/api/v1/instances/\(instanceId)/vault")
    }

    func toggleWishlist(cardId: String) async throws -> Bool {
        let response: WishlistToggleResponse = try await client.post("/api/v1/cards/\(cardId)/wishlist")
        return response.wishlisted
    }
}
