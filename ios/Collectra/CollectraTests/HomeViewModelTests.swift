import XCTest
@testable import Collectra

@MainActor
final class HomeViewModelTests: XCTestCase {
    func testOnAppearLoadsSummaryWhenIdle() async {
        let service = FakeHomeService()
        await service.stub(.success(.fixture(portfolioValueUsd: 100, topOwnedValuable: [.fixture()])))
        let viewModel = HomeViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.summary?.portfolioValueUsd, 100)
    }

    func testEmptySummaryProducesEmptyState() async {
        let service = FakeHomeService()
        await service.stub(.success(.fixture()))
        let viewModel = HomeViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .empty)
    }

    func testFailureSurfacesUserFacingErrorMessage() async {
        let service = FakeHomeService()
        await service.stub(.failure(FixtureError(message: "boom")))
        let viewModel = HomeViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        guard case .error(let message) = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertFalse(message.isEmpty)
    }

    func testOnAppearSkipsReloadWhenSyncRevisionUnchanged() async {
        let service = FakeHomeService()
        await service.stub(.success(.fixture(portfolioValueUsd: 50, topOwnedValuable: [.fixture()])))
        let viewModel = HomeViewModel(service: service, timeoutSeconds: 5)

        viewModel.onAppear()
        await viewModel.waitForLoad()
        viewModel.onAppear()
        await viewModel.waitForLoad()

        let fetchCount = await service.fetchCount
        XCTAssertEqual(fetchCount, 1)
    }

    func testOnAppearReloadsAfterSyncRevisionChanges() async {
        let service = FakeHomeService()
        await service.stub(.success(.fixture(portfolioValueUsd: 50, topOwnedValuable: [.fixture()])))
        let viewModel = HomeViewModel(service: service, timeoutSeconds: 5)
        viewModel.onAppear()
        await viewModel.waitForLoad()

        CollectionSyncCenter.shared.markChanged()
        viewModel.onAppear()
        await viewModel.waitForLoad()

        let fetchCount = await service.fetchCount
        XCTAssertEqual(fetchCount, 2)
    }

    func testRefreshAlwaysReloads() async {
        let service = FakeHomeService()
        await service.stub(.success(.fixture(portfolioValueUsd: 50, topOwnedValuable: [.fixture()])))
        let viewModel = HomeViewModel(service: service, timeoutSeconds: 5)
        viewModel.onAppear()
        await viewModel.waitForLoad()

        await service.stub(.success(.fixture(portfolioValueUsd: 75, topOwnedValuable: [.fixture()])))
        await viewModel.refresh()

        XCTAssertEqual(viewModel.summary?.portfolioValueUsd, 75)
    }
}
