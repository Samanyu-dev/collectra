import Foundation
@testable import Collectra

/// Fake `CollectionServicing` for Shelf/Vault/Wishlist/CardDetail mutation
/// tests — an `actor` so it's trivially `Sendable`, mirroring
/// `FakeCatalogService`/`FakeCardDetailService`'s pattern. Each method is
/// stubbed and recorded independently since, unlike catalog paging, these
/// seven calls are unrelated reads/mutations that tests exercise in
/// isolation.
actor FakeCollectionService: CollectionServicing {
    private(set) var shelfFetchCount = 0
    private(set) var vaultFetchCount = 0
    private(set) var wishlistFetchCount = 0
    private(set) var quantityCalls: [(cardId: String, variantId: String, action: QuantityAction)] = []
    private(set) var favoriteCalls: [String] = []
    private(set) var vaultCalls: [String] = []
    private(set) var wishlistCalls: [String] = []

    private var shelfResult: Result<[ShelfItem], Error> = .success([])
    private var vaultResult: Result<VaultResponse, Error> = .success(VaultResponse(items: [], totalVaultValue: 0))
    private var wishlistResult: Result<[WishlistItem], Error> = .success([])
    private var quantityResult: Result<Int, Error> = .success(0)
    private var favoriteResult: Result<FavoriteResponse, Error>?
    private var vaultToggleResult: Result<VaultToggleResponse, Error>?
    private var wishlistToggleResult: Result<Bool, Error>?

    func stubShelf(_ result: Result<[ShelfItem], Error>) { shelfResult = result }
    func stubVault(_ result: Result<VaultResponse, Error>) { vaultResult = result }
    func stubWishlist(_ result: Result<[WishlistItem], Error>) { wishlistResult = result }
    func stubQuantity(_ result: Result<Int, Error>) { quantityResult = result }
    func stubFavorite(_ result: Result<FavoriteResponse, Error>) { favoriteResult = result }
    func stubVaultToggle(_ result: Result<VaultToggleResponse, Error>) { vaultToggleResult = result }
    func stubWishlistToggle(_ result: Result<Bool, Error>) { wishlistToggleResult = result }

    func fetchShelf() async throws -> [ShelfItem] {
        shelfFetchCount += 1
        return try shelfResult.get()
    }

    func fetchVault() async throws -> VaultResponse {
        vaultFetchCount += 1
        return try vaultResult.get()
    }

    func fetchWishlist() async throws -> [WishlistItem] {
        wishlistFetchCount += 1
        return try wishlistResult.get()
    }

    func setQuantity(cardId: String, variantId: String, action: QuantityAction) async throws -> Int {
        quantityCalls.append((cardId, variantId, action))
        return try quantityResult.get()
    }

    func toggleFavorite(instanceId: String) async throws -> FavoriteResponse {
        favoriteCalls.append(instanceId)
        guard let favoriteResult else { throw FixtureError(message: "FakeCollectionService.toggleFavorite not stubbed") }
        return try favoriteResult.get()
    }

    func toggleVault(instanceId: String) async throws -> VaultToggleResponse {
        vaultCalls.append(instanceId)
        guard let vaultToggleResult else { throw FixtureError(message: "FakeCollectionService.toggleVault not stubbed") }
        return try vaultToggleResult.get()
    }

    func toggleWishlist(cardId: String) async throws -> Bool {
        wishlistCalls.append(cardId)
        guard let wishlistToggleResult else { throw FixtureError(message: "FakeCollectionService.toggleWishlist not stubbed") }
        return try wishlistToggleResult.get()
    }
}
