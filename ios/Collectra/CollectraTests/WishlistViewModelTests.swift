import XCTest
@testable import Collectra

@MainActor
final class WishlistViewModelTests: XCTestCase {
    func testOnAppearLoadsItems() async {
        let service = FakeCollectionService()
        await service.stubWishlist(.success([.fixture(id: "w1"), .fixture(id: "w2")]))
        let viewModel = WishlistViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.items.map(\.id), ["w1", "w2"])
    }

    func testEmptyResultProducesEmptyState() async {
        let service = FakeCollectionService()
        await service.stubWishlist(.success([]))
        let viewModel = WishlistViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .empty)
    }

    func testFailureSurfacesUserFacingErrorMessage() async {
        let service = FakeCollectionService()
        await service.stubWishlist(.failure(FixtureError(message: "boom")))
        let viewModel = WishlistViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        guard case .error(let message) = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertFalse(message.isEmpty)
    }

    func testOnAppearSkipsReloadWhenSyncRevisionUnchanged() async {
        let service = FakeCollectionService()
        await service.stubWishlist(.success([.fixture()]))
        let viewModel = WishlistViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()
        viewModel.onAppear()
        await viewModel.waitForLoad()

        let fetchCount = await service.wishlistFetchCount
        XCTAssertEqual(fetchCount, 1)
    }

    func testRefreshAlwaysReloads() async {
        let service = FakeCollectionService()
        await service.stubWishlist(.success([.fixture(id: "w1")]))
        let viewModel = WishlistViewModel(service: service)
        viewModel.onAppear()
        await viewModel.waitForLoad()

        await service.stubWishlist(.success([.fixture(id: "w1"), .fixture(id: "w2")]))
        await viewModel.refresh()

        XCTAssertEqual(viewModel.items.map(\.id), ["w1", "w2"])
    }
}
