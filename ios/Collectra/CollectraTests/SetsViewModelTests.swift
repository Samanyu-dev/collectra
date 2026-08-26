import XCTest
@testable import Collectra

@MainActor
final class SetsViewModelTests: XCTestCase {
    func testInitialLoadPopulatesItemsAndState() async {
        let service = FakeSetsService()
        await service.stub([
            .success(SetListResponse(
                items: [.fixture(id: "1"), .fixture(id: "2")],
                pagination: PaginationMeta(page: 1, pageSize: 40, total: 2, totalPages: 1)
            ))
        ])
        let viewModel = SetsViewModel(service: service, pageSize: 40)

        await viewModel.reload(query: "")

        XCTAssertEqual(viewModel.items.map(\.id), ["1", "2"])
        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertFalse(viewModel.hasMorePages)
    }

    func testEmptyResultsProduceEmptyState() async {
        let service = FakeSetsService()
        await service.stub([
            .success(SetListResponse(items: [], pagination: PaginationMeta(page: 1, pageSize: 40, total: 0, totalPages: 1)))
        ])
        let viewModel = SetsViewModel(service: service, pageSize: 40)

        await viewModel.reload(query: "zzz-no-match")

        XCTAssertEqual(viewModel.loadState, .empty)
        XCTAssertTrue(viewModel.items.isEmpty)
    }

    func testNetworkFailureSurfacesErrorStateAndClearsItems() async {
        let service = FakeSetsService()
        await service.stub([.failure(FixtureError(message: "boom"))])
        let viewModel = SetsViewModel(service: service, pageSize: 40)

        await viewModel.reload(query: "")

        guard case .error = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertTrue(viewModel.items.isEmpty)
    }

    func testSearchIsDebouncedNotFiredPerKeystroke() async {
        let service = FakeSetsService()
        await service.stub([
            .success(SetListResponse(items: [.fixture(id: "3")], pagination: PaginationMeta(page: 1, pageSize: 40, total: 1, totalPages: 1))),
        ])
        let viewModel = SetsViewModel(service: service, pageSize: 40, debounceNanoseconds: 20_000_000)

        viewModel.searchText = "1"
        viewModel.onSearchTextChanged()
        viewModel.searchText = "15"
        viewModel.onSearchTextChanged()
        viewModel.searchText = "151"
        viewModel.onSearchTextChanged()

        let callsBeforeAwait = await service.calls
        XCTAssertTrue(callsBeforeAwait.isEmpty)

        await viewModel.waitForSearchDebounce()

        let calls = await service.calls
        XCTAssertEqual(calls.count, 1, "earlier keystrokes' debounce tasks should have been cancelled, not fired")
        XCTAssertEqual(calls.first?.query, "151")
    }

    func testLoadNextPageAppendsAndStopsAtLastPage() async {
        let service = FakeSetsService()
        let page1Items = (1...40).map { SetSummary.fixture(id: "\($0)") }
        let page2Items = (41...45).map { SetSummary.fixture(id: "\($0)") }
        await service.stub([
            .success(SetListResponse(items: page1Items, pagination: PaginationMeta(page: 1, pageSize: 40, total: 45, totalPages: 2))),
            .success(SetListResponse(items: page2Items, pagination: PaginationMeta(page: 2, pageSize: 40, total: 45, totalPages: 2))),
        ])
        let viewModel = SetsViewModel(service: service, pageSize: 40)
        await viewModel.reload(query: "")
        XCTAssertTrue(viewModel.hasMorePages)

        guard let trigger = viewModel.items.last else { return XCTFail() }
        viewModel.loadNextPageIfNeeded(currentItem: trigger)
        await viewModel.waitForNextPage()

        XCTAssertEqual(viewModel.items.count, 45)
        XCTAssertFalse(viewModel.hasMorePages)
    }

    func testFailedNextPagePreservesAlreadyLoadedItems() async {
        let service = FakeSetsService()
        let page1Items = (1...40).map { SetSummary.fixture(id: "\($0)") }
        await service.stub([
            .success(SetListResponse(items: page1Items, pagination: PaginationMeta(page: 1, pageSize: 40, total: 80, totalPages: 2))),
            .failure(FixtureError(message: "network down")),
        ])
        let viewModel = SetsViewModel(service: service, pageSize: 40)
        await viewModel.reload(query: "")

        guard let trigger = viewModel.items.last else { return XCTFail() }
        viewModel.loadNextPageIfNeeded(currentItem: trigger)
        await viewModel.waitForNextPage()

        XCTAssertEqual(viewModel.items.count, 40, "existing items must survive a failed later page")
        XCTAssertNotNil(viewModel.paginationErrorMessage)
        XCTAssertTrue(viewModel.hasMorePages)
    }
}

@MainActor
final class SetDetailViewModelTests: XCTestCase {
    func testLoadPopulatesDetail() async {
        let service = FakeSetsService()
        let detail = SetDetail(
            id: "set-1", name: "151", franchiseName: "Pokémon", brandName: "Pokémon TCG",
            seriesName: "Scarlet & Violet", imageUrl: nil, releaseDate: nil,
            printedTotal: 165, ownedCount: 12, totalValueUsd: 42.5
        )
        await service.stubDetail(.success(detail))
        let viewModel = SetDetailViewModel(setId: "set-1", service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        guard case .loaded(let loaded) = viewModel.state else {
            return XCTFail("expected .loaded, got \(viewModel.state)")
        }
        XCTAssertEqual(loaded.id, "set-1")
        XCTAssertEqual(loaded.ownedCount, 12)
    }

    func testFailureSurfacesUserFacingErrorMessage() async {
        let service = FakeSetsService()
        await service.stubDetail(.failure(FixtureError(message: "boom")))
        let viewModel = SetDetailViewModel(setId: "set-1", service: service)

        viewModel.onAppear()
        await viewModel.waitForLoad()

        guard case .error = viewModel.state else {
            return XCTFail("expected .error, got \(viewModel.state)")
        }
    }
}
