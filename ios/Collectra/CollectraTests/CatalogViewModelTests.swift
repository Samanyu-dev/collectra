import XCTest
@testable import Collectra

@MainActor
final class CatalogViewModelTests: XCTestCase {
    func testInitialLoadPopulatesItemsAndState() async {
        let service = FakeCatalogService()
        await service.stub([
            .success(CardListResponse(
                items: [.fixture(id: "1"), .fixture(id: "2")],
                pagination: PaginationMeta(page: 1, pageSize: 30, total: 2, totalPages: 1)
            ))
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)

        await viewModel.reload(query: "")

        XCTAssertEqual(viewModel.items.map(\.id), ["1", "2"])
        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertFalse(viewModel.hasMorePages)
    }

    func testEmptyResultsProduceEmptyState() async {
        let service = FakeCatalogService()
        await service.stub([
            .success(CardListResponse(items: [], pagination: PaginationMeta(page: 1, pageSize: 30, total: 0, totalPages: 1)))
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)

        await viewModel.reload(query: "zzz-no-match")

        XCTAssertEqual(viewModel.loadState, .empty)
        XCTAssertTrue(viewModel.items.isEmpty)
    }

    func testNetworkFailureSurfacesErrorStateAndClearsItems() async {
        let service = FakeCatalogService()
        await service.stub([.failure(FixtureError(message: "boom"))])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)

        await viewModel.reload(query: "")

        guard case .error = viewModel.loadState else {
            return XCTFail("expected .error, got \(viewModel.loadState)")
        }
        XCTAssertTrue(viewModel.items.isEmpty)
    }

    func testSearchIsDebouncedNotFiredPerKeystroke() async {
        let service = FakeCatalogService()
        // Only one response stubbed: cancellation means the "l"/"lu" debounce
        // tasks must never reach the network at all, so only the final
        // ("luk") search should ever consume a response.
        await service.stub([
            .success(CardListResponse(items: [.fixture(id: "3")], pagination: PaginationMeta(page: 1, pageSize: 30, total: 1, totalPages: 1))),
        ])
        // Debounce interval is irrelevant to correctness here since we await
        // the scheduled task directly rather than sleeping past it.
        let viewModel = CatalogViewModel(service: service, pageSize: 30, debounceNanoseconds: 20_000_000)

        viewModel.searchText = "l"
        viewModel.onSearchTextChanged()
        viewModel.searchText = "lu"
        viewModel.onSearchTextChanged()
        viewModel.searchText = "luk"
        viewModel.onSearchTextChanged()

        // No suspension point has occurred yet, so nothing should have fired.
        let callsBeforeAwait = await service.calls
        XCTAssertTrue(callsBeforeAwait.isEmpty)

        await viewModel.waitForSearchDebounce()

        let calls = await service.calls
        XCTAssertEqual(calls.count, 1, "earlier keystrokes' debounce tasks should have been cancelled, not fired")
        XCTAssertEqual(calls.first?.query, "luk")
        XCTAssertEqual(viewModel.items.map(\.id), ["3"])
    }

    func testClearSearchReloadsWithEmptyQuery() async {
        let service = FakeCatalogService()
        await service.stub([
            .success(CardListResponse(items: [.fixture(id: "1")], pagination: PaginationMeta(page: 1, pageSize: 30, total: 1, totalPages: 1))),
            .success(CardListResponse(items: [.fixture(id: "2")], pagination: PaginationMeta(page: 1, pageSize: 30, total: 1, totalPages: 1))),
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)
        await viewModel.reload(query: "pikachu")

        viewModel.clearSearch()
        await viewModel.waitForPendingAction()

        XCTAssertEqual(viewModel.searchText, "")
        let calls = await service.calls
        XCTAssertEqual(calls.last?.query, "")
    }

    func testLoadNextPageAppendsAndStopsAtLastPage() async {
        let service = FakeCatalogService()
        let page1Items = (1...30).map { CardSummary.fixture(id: "\($0)") }
        let page2Items = (31...35).map { CardSummary.fixture(id: "\($0)") }
        await service.stub([
            .success(CardListResponse(items: page1Items, pagination: PaginationMeta(page: 1, pageSize: 30, total: 35, totalPages: 2))),
            .success(CardListResponse(items: page2Items, pagination: PaginationMeta(page: 2, pageSize: 30, total: 35, totalPages: 2))),
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)
        await viewModel.reload(query: "")
        XCTAssertTrue(viewModel.hasMorePages)

        guard let trigger = viewModel.items.last else { return XCTFail() }
        viewModel.loadNextPageIfNeeded(currentItem: trigger)
        await viewModel.waitForNextPage()

        XCTAssertEqual(viewModel.items.count, 35)
        XCTAssertFalse(viewModel.hasMorePages)
        let calls = await service.calls
        XCTAssertEqual(calls.map(\.page), [1, 2])
    }

    func testLoadNextPageIgnoresTriggersFarFromTheEnd() async {
        let service = FakeCatalogService()
        let page1Items = (1...30).map { CardSummary.fixture(id: "\($0)") }
        await service.stub([
            .success(CardListResponse(items: page1Items, pagination: PaginationMeta(page: 1, pageSize: 30, total: 60, totalPages: 2))),
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)
        await viewModel.reload(query: "")

        // First item is nowhere near the trailing edge.
        viewModel.loadNextPageIfNeeded(currentItem: viewModel.items[0])
        await viewModel.waitForNextPage()

        let calls = await service.calls
        XCTAssertEqual(calls.count, 1, "only the initial page-1 load should have happened")
    }

    func testDuplicateNextPageTriggersWhileLoadingAreIgnored() async {
        let service = FakeCatalogService()
        let page1Items = (1...30).map { CardSummary.fixture(id: "\($0)") }
        let page2Items = (31...60).map { CardSummary.fixture(id: "\($0)") }
        await service.stub([
            .success(CardListResponse(items: page1Items, pagination: PaginationMeta(page: 1, pageSize: 30, total: 90, totalPages: 3))),
            .success(CardListResponse(items: page2Items, pagination: PaginationMeta(page: 2, pageSize: 30, total: 90, totalPages: 3))),
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)
        await viewModel.reload(query: "")

        guard let trigger = viewModel.items.last else { return XCTFail() }
        // Two rapid triggers for the same trailing item, as a fast scroll would fire.
        viewModel.loadNextPageIfNeeded(currentItem: trigger)
        viewModel.loadNextPageIfNeeded(currentItem: trigger)
        await viewModel.waitForNextPage()

        let calls = await service.calls
        XCTAssertEqual(calls.map(\.page), [1, 2], "the second trigger must not launch a duplicate request for page 2")
    }

    func testFailedNextPagePreservesAlreadyLoadedItems() async {
        let service = FakeCatalogService()
        let page1Items = (1...30).map { CardSummary.fixture(id: "\($0)") }
        await service.stub([
            .success(CardListResponse(items: page1Items, pagination: PaginationMeta(page: 1, pageSize: 30, total: 60, totalPages: 2))),
            .failure(FixtureError(message: "network down")),
        ])
        let viewModel = CatalogViewModel(service: service, pageSize: 30)
        await viewModel.reload(query: "")

        guard let trigger = viewModel.items.last else { return XCTFail() }
        viewModel.loadNextPageIfNeeded(currentItem: trigger)
        await viewModel.waitForNextPage()

        XCTAssertEqual(viewModel.items.count, 30, "existing items must survive a failed later page")
        XCTAssertNotNil(viewModel.paginationErrorMessage)
        XCTAssertTrue(viewModel.hasMorePages, "a failed page fetch must not advance pagination state")
    }
}
