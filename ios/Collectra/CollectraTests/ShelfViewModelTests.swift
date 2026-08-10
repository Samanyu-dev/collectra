import XCTest
@testable import Collectra

@MainActor
final class ShelfViewModelTests: XCTestCase {
    func testOnAppearLoadsItemsWhenIdle() async {
        let service = FakeCollectionService()
        await service.stubShelf(.success([.fixture(variantId: "v1"), .fixture(variantId: "v2")]))
        let viewModel = ShelfViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.items.map(\.variantId), ["v1", "v2"])
    }

    func testEmptyResultProducesEmptyState() async {
        let service = FakeCollectionService()
        await service.stubShelf(.success([]))
        let viewModel = ShelfViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .empty)
    }

    func testFailureSurfacesUserFacingErrorMessage() async {
        let service = FakeCollectionService()
        await service.stubShelf(.failure(FixtureError(message: "boom")))
        let viewModel = ShelfViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        guard case .error(let message) = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertFalse(message.isEmpty)
    }

    func testOnAppearSkipsReloadWhenSyncRevisionUnchanged() async {
        let service = FakeCollectionService()
        await service.stubShelf(.success([.fixture()]))
        let viewModel = ShelfViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()
        viewModel.onAppear() // no mutation happened since — must not refetch
        await viewModel.waitForLoad()

        let fetchCount = await service.shelfFetchCount
        XCTAssertEqual(fetchCount, 1)
        XCTAssertEqual(viewModel.loadState, .loaded)
    }

    func testOnAppearReloadsAfterSyncRevisionChanges() async {
        let service = FakeCollectionService()
        await service.stubShelf(.success([.fixture()]))
        let viewModel = ShelfViewModel(service: service, timeoutSeconds: 5)
        viewModel.onAppear()
        await viewModel.waitForLoad()

        CollectionSyncCenter.shared.markChanged()
        viewModel.onAppear()
        await viewModel.waitForLoad()

        let fetchCount = await service.shelfFetchCount
        XCTAssertEqual(fetchCount, 2)
    }

    func testRefreshAlwaysReloads() async {
        let service = FakeCollectionService()
        await service.stubShelf(.success([.fixture(variantId: "v1")]))
        let viewModel = ShelfViewModel(service: service, timeoutSeconds: 5)
        viewModel.onAppear()
        await viewModel.waitForLoad()

        await service.stubShelf(.success([.fixture(variantId: "v1"), .fixture(variantId: "v2")]))
        await viewModel.refresh()

        XCTAssertEqual(viewModel.items.map(\.variantId), ["v1", "v2"])
    }
}
