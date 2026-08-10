import XCTest
@testable import Collectra

@MainActor
final class CardDetailViewModelTests: XCTestCase {
    private func makeDetail(variantIds: [String], instanceId: String? = nil, isWishlisted: Bool = false) throws -> CardDetail {
        let variants = variantIds.map { id in
            """
            {
                "id": "\(id)", "printing": { "id": "p", "name": "\(id)" }, "parallel": null, "insert": null,
                "isFoil": false, "isAuto": false, "isPatch": false, "isRelic": false, "serialTo": null,
                "price": { "valueUsd": 1.0, "confidenceLabel": "HIGH", "observationCount": 1, "lastUpdated": null, "sources": [] },
                "priceHistory": null, "gradedPriceHistory": null,
                "ownedQuantity": \(instanceId == nil ? 0 : 1), "instanceId": \(instanceId.map { "\"\($0)\"" } ?? "null"),
                "vaulted": false, "favorited": false
            }
            """
        }.joined(separator: ",")
        let json = """
        {
            "id": "card-1", "name": "Card", "number": "1", "supertype": null, "subtypes": null, "hp": null, "flavorText": null, "rules": null,
            "set": { "id": "s", "name": "Set", "franchiseName": "Franchise" },
            "images": [], "variants": [\(variants)], "viewer": {"isWishlisted": \(isWishlisted)}
        }
        """
        return try JSONFixtures.decode(CardDetail.self, from: json)
    }

    private func makeLoadedViewModel(
        variantIds: [String] = ["v1"],
        instanceId: String? = nil,
        isWishlisted: Bool = false,
        collectionService: FakeCollectionService = FakeCollectionService()
    ) async throws -> CardDetailViewModel {
        let detail = try makeDetail(variantIds: variantIds, instanceId: instanceId, isWishlisted: isWishlisted)
        let service = FakeCardDetailService()
        await service.stub(.success(detail))
        let viewModel = CardDetailViewModel(cardId: "card-1", service: service, collectionService: collectionService)
        viewModel.load()
        await viewModel.waitForLoad()
        return viewModel
    }

    func testLoadPopulatesDetailAndDefaultsToFirstVariant() async throws {
        let detail = try makeDetail(variantIds: ["v1", "v2"])
        let service = FakeCardDetailService()
        await service.stub(.success(detail))
        let viewModel = CardDetailViewModel(cardId: "card-1", service: service)

        viewModel.load()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.selectedVariantId, "v1")
        XCTAssertEqual(viewModel.selectedVariant?.id, "v1")
        let requestedIds = await service.requestedIds
        XCTAssertEqual(requestedIds, ["card-1"])
    }

    func testSelectingAVariantUpdatesSelectedVariant() async throws {
        let detail = try makeDetail(variantIds: ["v1", "v2"])
        let service = FakeCardDetailService()
        await service.stub(.success(detail))
        let viewModel = CardDetailViewModel(cardId: "card-1", service: service)
        viewModel.load()
        await viewModel.waitForLoad()

        viewModel.select(variant: detail.variants[1])

        XCTAssertEqual(viewModel.selectedVariantId, "v2")
        XCTAssertEqual(viewModel.selectedVariant?.id, "v2")
    }

    func testDuplicateLoadCallsDoNotDoubleRequest() async throws {
        let detail = try makeDetail(variantIds: ["v1"])
        let service = FakeCardDetailService()
        await service.stub(.success(detail))
        let viewModel = CardDetailViewModel(cardId: "card-1", service: service)

        viewModel.load()
        viewModel.load() // fired before the first has resolved — must be a no-op
        await viewModel.waitForLoad()

        let requestedIds = await service.requestedIds
        XCTAssertEqual(requestedIds.count, 1)
    }

    func testFailureSurfacesUserFacingErrorMessage() async {
        let service = FakeCardDetailService()
        await service.stub(.failure(FixtureError(message: "boom")))
        let viewModel = CardDetailViewModel(cardId: "card-1", service: service)

        viewModel.load()
        await viewModel.waitForLoad()

        guard case .error(let message) = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertFalse(message.isEmpty)
        XCTAssertNil(viewModel.detail)
    }

    func testRetryAfterFailureCanSucceed() async {
        let service = FakeCardDetailService()
        await service.stub(.failure(FixtureError(message: "boom")))
        let viewModel = CardDetailViewModel(cardId: "card-1", service: service)
        viewModel.load()
        await viewModel.waitForLoad()

        let detail = try! makeDetail(variantIds: ["v1"])
        await service.stub(.success(detail))
        viewModel.retry()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.selectedVariantId, "v1")
    }

    // MARK: - Quantity

    func testIncrementQuantityCallsServiceWithSelectedVariant() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubQuantity(.success(1))
        let viewModel = try await makeLoadedViewModel(collectionService: collectionService)

        viewModel.changeQuantity(.increment)
        await viewModel.waitForQuantityMutation()

        let calls = await collectionService.quantityCalls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls[0].action, .increment)
        XCTAssertEqual(calls[0].variantId, "v1")
    }

    func testDecrementAtZeroIsANoOp() async throws {
        let collectionService = FakeCollectionService()
        let viewModel = try await makeLoadedViewModel(collectionService: collectionService)

        viewModel.changeQuantity(.decrement)
        await viewModel.waitForQuantityMutation()

        let calls = await collectionService.quantityCalls
        XCTAssertEqual(calls.count, 0)
    }

    func testQuantityMutationFailureSurfacesErrorMessage() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubQuantity(.failure(FixtureError(message: "boom")))
        let viewModel = try await makeLoadedViewModel(collectionService: collectionService)

        viewModel.changeQuantity(.increment)
        await viewModel.waitForQuantityMutation()

        XCTAssertNotNil(viewModel.mutationErrorMessage)
        XCTAssertFalse(viewModel.isMutatingQuantity)
    }

    // MARK: - Favorite

    func testToggleFavoriteNoOpsWhenVariantHasNoInstanceId() async throws {
        let collectionService = FakeCollectionService()
        let viewModel = try await makeLoadedViewModel(instanceId: nil, collectionService: collectionService)

        viewModel.toggleFavorite()
        await viewModel.waitForFavoriteMutation()

        let calls = await collectionService.favoriteCalls
        XCTAssertEqual(calls.count, 0)
    }

    func testToggleFavoriteAppliesOptimisticThenServerConfirmedState() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubFavorite(.success(FavoriteResponse(instanceId: "instance-1", favorited: true)))
        let viewModel = try await makeLoadedViewModel(instanceId: "instance-1", collectionService: collectionService)
        XCTAssertEqual(viewModel.selectedVariant?.favorited, false)

        viewModel.toggleFavorite()
        XCTAssertEqual(viewModel.selectedVariant?.favorited, true, "optimistic update should apply synchronously")

        await viewModel.waitForFavoriteMutation()

        XCTAssertEqual(viewModel.selectedVariant?.favorited, true)
        let calls = await collectionService.favoriteCalls
        XCTAssertEqual(calls, ["instance-1"])
    }

    func testToggleFavoriteRollsBackOptimisticUpdateOnFailure() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubFavorite(.failure(FixtureError(message: "boom")))
        let viewModel = try await makeLoadedViewModel(instanceId: "instance-1", collectionService: collectionService)

        viewModel.toggleFavorite()
        await viewModel.waitForFavoriteMutation()

        XCTAssertEqual(viewModel.selectedVariant?.favorited, false, "failed mutation must roll back")
        XCTAssertNotNil(viewModel.mutationErrorMessage)
    }

    // MARK: - Vault

    func testToggleVaultAppliesServerConfirmedState() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubVaultToggle(.success(VaultToggleResponse(instanceId: "instance-1", vaulted: true)))
        let viewModel = try await makeLoadedViewModel(instanceId: "instance-1", collectionService: collectionService)

        viewModel.toggleVault()
        await viewModel.waitForVaultMutation()

        XCTAssertEqual(viewModel.selectedVariant?.vaulted, true)
        let calls = await collectionService.vaultCalls
        XCTAssertEqual(calls, ["instance-1"])
    }

    func testToggleVaultNoOpsWhenVariantHasNoInstanceId() async throws {
        let collectionService = FakeCollectionService()
        let viewModel = try await makeLoadedViewModel(instanceId: nil, collectionService: collectionService)

        viewModel.toggleVault()
        await viewModel.waitForVaultMutation()

        let calls = await collectionService.vaultCalls
        XCTAssertEqual(calls.count, 0)
    }

    // MARK: - Wishlist

    func testToggleWishlistWorksWithoutAnOwnedInstance() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubWishlistToggle(.success(true))
        let viewModel = try await makeLoadedViewModel(instanceId: nil, isWishlisted: false, collectionService: collectionService)

        viewModel.toggleWishlist()
        XCTAssertEqual(viewModel.detail?.viewer?.isWishlisted, true, "optimistic update should apply synchronously")

        await viewModel.waitForWishlistMutation()

        XCTAssertEqual(viewModel.detail?.viewer?.isWishlisted, true)
        let calls = await collectionService.wishlistCalls
        XCTAssertEqual(calls, ["card-1"])
    }

    func testToggleWishlistRollsBackOnFailure() async throws {
        let collectionService = FakeCollectionService()
        await collectionService.stubWishlistToggle(.failure(FixtureError(message: "boom")))
        let viewModel = try await makeLoadedViewModel(isWishlisted: false, collectionService: collectionService)

        viewModel.toggleWishlist()
        await viewModel.waitForWishlistMutation()

        XCTAssertEqual(viewModel.detail?.viewer?.isWishlisted, false)
        XCTAssertNotNil(viewModel.mutationErrorMessage)
    }
}
