import XCTest
@testable import Collectra

@MainActor
final class VaultViewModelTests: XCTestCase {
    func testOnAppearLoadsItemsAndTotalValue() async {
        let service = FakeCollectionService()
        await service.stubVault(.success(VaultResponse(items: [.fixture(instanceId: "i1"), .fixture(instanceId: "i2")], totalVaultValue: 250.0)))
        let viewModel = VaultViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.items.map(\.instanceId), ["i1", "i2"])
        XCTAssertEqual(viewModel.totalVaultValue, 250.0)
    }

    func testEmptyResultProducesEmptyState() async {
        let service = FakeCollectionService()
        await service.stubVault(.success(VaultResponse(items: [], totalVaultValue: 0)))
        let viewModel = VaultViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        XCTAssertEqual(viewModel.loadState, .empty)
    }

    func testFailureSurfacesUserFacingErrorMessage() async {
        let service = FakeCollectionService()
        await service.stubVault(.failure(FixtureError(message: "boom")))
        let viewModel = VaultViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        guard case .error(let message) = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertFalse(message.isEmpty)
    }

    func testOnAppearSkipsReloadWhenSyncRevisionUnchanged() async {
        let service = FakeCollectionService()
        await service.stubVault(.success(VaultResponse(items: [.fixture()], totalVaultValue: 10)))
        let viewModel = VaultViewModel(service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()
        viewModel.onAppear()
        await viewModel.waitForLoad()

        let fetchCount = await service.vaultFetchCount
        XCTAssertEqual(fetchCount, 1)
    }

    func testRefreshAlwaysReloads() async {
        let service = FakeCollectionService()
        await service.stubVault(.success(VaultResponse(items: [.fixture(instanceId: "i1")], totalVaultValue: 10)))
        let viewModel = VaultViewModel(service: service)
        viewModel.onAppear()
        await viewModel.waitForLoad()

        await service.stubVault(.success(VaultResponse(items: [.fixture(instanceId: "i1"), .fixture(instanceId: "i2")], totalVaultValue: 20)))
        await viewModel.refresh()

        XCTAssertEqual(viewModel.items.map(\.instanceId), ["i1", "i2"])
        XCTAssertEqual(viewModel.totalVaultValue, 20)
    }
}
