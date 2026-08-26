import Foundation

/// Drives the Sets grid: browsing, debounced search, and incremental
/// pagination against `GET /api/v1/sets` via `SetsServicing`. Structurally
/// identical to `CatalogViewModel` (same generation-counter/debounce/
/// near-end-pagination pattern) — kept as a parallel type rather than a
/// shared generic base since the two already diverge (Sets has no owned-
/// quantity concept) and forcing them into one abstraction would cost more
/// than the duplication does.
@MainActor
final class SetsViewModel: ObservableObject {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded
        case empty
        case error(String)
    }

    @Published var searchText: String = ""
    @Published private(set) var items: [SetSummary] = []
    @Published private(set) var loadState: LoadState = .idle
    @Published private(set) var isLoadingNextPage = false
    @Published private(set) var paginationErrorMessage: String?

    private let service: SetsServicing
    private let pageSize: Int
    private let debounceNanoseconds: UInt64

    private var pagination: PaginationMeta?
    private var currentQuery: String = ""
    private var searchDebounceTask: Task<Void, Never>?
    private var loadTask: Task<Void, Never>?
    private var nextPageTask: Task<Void, Never>?
    private var actionTask: Task<Void, Never>?
    private var generation = 0

    init(
        service: SetsServicing = SetsService(),
        pageSize: Int = 40,
        debounceNanoseconds: UInt64 = 350_000_000
    ) {
        self.service = service
        self.pageSize = pageSize
        self.debounceNanoseconds = debounceNanoseconds
    }

    var hasMorePages: Bool {
        guard let pagination else { return false }
        return !pagination.isLastPage
    }

    func onAppear() {
        guard items.isEmpty, loadState == .idle else { return }
        launchReload(query: searchText)
    }

    func onSearchTextChanged() {
        searchDebounceTask?.cancel()
        let text = searchText
        searchDebounceTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: self.debounceNanoseconds)
            guard !Task.isCancelled else { return }
            await self.reload(query: text)
        }
    }

    func submitSearchNow() {
        searchDebounceTask?.cancel()
        launchReload(query: searchText)
    }

    func clearSearch() {
        searchDebounceTask?.cancel()
        searchText = ""
        launchReload(query: "")
    }

    func refresh() async {
        searchDebounceTask?.cancel()
        await reload(query: searchText)
    }

    func retry() {
        launchReload(query: searchText)
    }

    @discardableResult
    private func launchReload(query: String) -> Task<Void, Never> {
        let task = Task { await reload(query: query) }
        actionTask = task
        return task
    }

    func reload(query: String) async {
        loadTask?.cancel()
        generation += 1
        let myGeneration = generation
        currentQuery = query
        loadState = .loading
        paginationErrorMessage = nil

        let task = Task { [service, pageSize] () -> Void in
            do {
                let response = try await service.fetchSets(query: query, page: 1, pageSize: pageSize)
                guard !Task.isCancelled, myGeneration == self.generation else { return }
                self.items = response.items
                self.pagination = response.pagination
                self.loadState = response.items.isEmpty ? .empty : .loaded
            } catch {
                guard !Task.isCancelled, myGeneration == self.generation else { return }
                self.items = []
                self.pagination = nil
                self.loadState = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
            }
        }
        loadTask = task
        await task.value
    }

    func retryNextPage() {
        guard let last = items.last else { return }
        paginationErrorMessage = nil
        loadNextPageIfNeeded(currentItem: last)
    }

    func loadNextPageIfNeeded(currentItem: SetSummary) {
        guard let pagination, !pagination.isLastPage else { return }
        guard !isLoadingNextPage else { return }
        guard let index = items.firstIndex(where: { $0.id == currentItem.id }) else { return }
        guard index >= items.count - 5 else { return }

        let myGeneration = generation
        let query = currentQuery
        let nextPage = pagination.page + 1

        isLoadingNextPage = true
        paginationErrorMessage = nil
        nextPageTask = Task { [service, pageSize] () -> Void in
            defer { self.isLoadingNextPage = false }
            do {
                let response = try await service.fetchSets(query: query, page: nextPage, pageSize: pageSize)
                guard myGeneration == self.generation else { return }
                self.items += response.items
                self.pagination = response.pagination
            } catch {
                guard myGeneration == self.generation else { return }
                self.paginationErrorMessage = (error as? APIError)?.userMessage ?? "Couldn't load more sets."
            }
        }
    }

    func waitForSearchDebounce() async {
        await searchDebounceTask?.value
    }

    func waitForNextPage() async {
        await nextPageTask?.value
    }

    func waitForPendingAction() async {
        await actionTask?.value
    }
}
