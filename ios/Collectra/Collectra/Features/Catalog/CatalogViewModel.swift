import Foundation

/// Drives `CatalogView`: browsing, debounced search, and incremental
/// pagination against `GET /api/v1/cards` via `CatalogServicing`. Owned as a
/// `@StateObject` by `CatalogView`, which stays mounted underneath the
/// catalog's own `NavigationStack` while a card detail is pushed — that's
/// what makes search text/results/scroll position survive a push-then-back
/// without this view model doing anything extra (Phase 4 requirement §10).
@MainActor
final class CatalogViewModel: ObservableObject {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded
        case empty
        case error(String)
    }

    @Published var searchText: String = ""
    @Published private(set) var items: [CardSummary] = []
    @Published private(set) var loadState: LoadState = .idle
    @Published private(set) var isLoadingNextPage = false
    @Published private(set) var paginationErrorMessage: String?

    private let service: CatalogServicing
    private let pageSize: Int
    private let debounceNanoseconds: UInt64

    private var pagination: PaginationMeta?
    private var currentQuery: String = ""
    private var searchDebounceTask: Task<Void, Never>?
    private var loadTask: Task<Void, Never>?
    private var nextPageTask: Task<Void, Never>?
    /// Tracks whichever fire-and-forget reload was launched most recently by
    /// `onAppear`/`submitSearchNow`/`clearSearch`/`retry`, so tests (and
    /// `waitForPendingAction`) have a single handle to await regardless of
    /// which entry point triggered it.
    private var actionTask: Task<Void, Never>?

    /// Bumped on every new search/reload so a slow, now-stale response (e.g.
    /// page 1 of a search the user has since changed) is discarded instead
    /// of clobbering newer results that already landed.
    private var generation = 0

    init(
        service: CatalogServicing = CatalogService(),
        pageSize: Int = 30,
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

    /// Call from the view's `.onChange(of: searchText)`. Cancels any pending
    /// debounce and schedules a new one — does not fire a request per
    /// keystroke (Phase 4 requirement §3).
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

    /// Bypasses the debounce — used for the keyboard's search/return key so
    /// an explicit submit doesn't wait out the same delay a keystroke would.
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

    /// Not `private`: unit tests (`@testable import`) call this directly to
    /// drive loading deterministically instead of racing the fire-and-forget
    /// `Task` that `onAppear`/`retry`/etc. wrap it in.
    func reload(query: String) async {
        loadTask?.cancel()
        generation += 1
        let myGeneration = generation
        currentQuery = query
        loadState = .loading
        paginationErrorMessage = nil

        let task = Task { [service, pageSize] () -> Void in
            do {
                let response = try await service.fetchCards(query: query, page: 1, pageSize: pageSize)
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

    /// Re-attempts the page that just failed, using the last loaded item as
    /// the trigger (always satisfies `loadNextPageIfNeeded`'s near-the-end
    /// check) — the retry action behind the pagination error banner.
    func retryNextPage() {
        guard let last = items.last else { return }
        paginationErrorMessage = nil
        loadNextPageIfNeeded(currentItem: last)
    }

    /// Called as the grid scrolls near the end of `items`. Dedupes on
    /// `isLoadingNextPage` so a fast scroll re-triggering this for the same
    /// trailing rows never launches a second request for the same page
    /// (Phase 4 requirement §4), and stops once `pagination` says there's no
    /// next page — never assumes a fixed page count.
    func loadNextPageIfNeeded(currentItem: CardSummary) {
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
                let response = try await service.fetchCards(query: query, page: nextPage, pageSize: pageSize)
                guard myGeneration == self.generation else { return }
                self.items += response.items
                self.pagination = response.pagination
            } catch {
                guard myGeneration == self.generation else { return }
                // Deliberately does NOT clear `items` — a failed later page
                // preserves everything already loaded (Phase 4 requirement §4).
                self.paginationErrorMessage = (error as? APIError)?.userMessage ?? "Couldn't load more cards."
            }
        }
    }

    /// Test-only: awaits the in-flight debounced search, if any, so tests can
    /// observe its eventual effect deterministically instead of sleeping past
    /// `debounceNanoseconds`.
    func waitForSearchDebounce() async {
        await searchDebounceTask?.value
    }

    /// Test-only: awaits the in-flight next-page fetch, if any.
    func waitForNextPage() async {
        await nextPageTask?.value
    }

    /// Test-only: awaits whichever of `onAppear`/`submitSearchNow`/
    /// `clearSearch`/`retry` most recently launched a reload.
    func waitForPendingAction() async {
        await actionTask?.value
    }
}
