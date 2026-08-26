import Foundation

/// Drives `HomeView`: loads `GET /api/v1/dashboard` via `HomeServicing`.
/// Structurally mirrors `ShelfViewModel` (revision-aware via
/// `CollectionSyncCenter`, timeout-bounded, single-shot fetch — no
/// pagination/search, unlike Catalog/Sets) rather than `CatalogViewModel`'s
/// heavier pattern, since Home is "load my one summary," not a browsable list.
@MainActor
final class HomeViewModel: ObservableObject {
    @Published private(set) var summary: DashboardSummary?
    @Published private(set) var loadState: CollectionLoadState = .idle

    private let service: HomeServicing
    private let timeoutSeconds: UInt64
    private var loadTask: Task<Void, Never>?
    private var loadedRevision: Int?

    init(service: HomeServicing = HomeService(), timeoutSeconds: UInt64 = 30) {
        self.service = service
        self.timeoutSeconds = timeoutSeconds
    }

    func onAppear() {
        let currentRevision = CollectionSyncCenter.shared.revision
        if loadState == .idle || loadedRevision != currentRevision {
            load()
        }
    }

    func refresh() async {
        await performLoad()
    }

    func retry() {
        load()
    }

    private func load() {
        guard loadTask == nil else { return }
        loadTask = Task {
            await self.performLoad()
            self.loadTask = nil
        }
    }

    private func performLoad() async {
        loadState = .loading
        let revisionAtStart = CollectionSyncCenter.shared.revision
        do {
            let summary = try await withTimeout(seconds: timeoutSeconds) {
                try await self.service.fetchDashboard()
            }
            self.summary = summary
            self.loadedRevision = revisionAtStart
            self.loadState = summary.isEmpty ? .empty : .loaded
        } catch is TimeoutError {
            self.loadState = .error("This is taking longer than expected. Please try again.")
        } catch {
            self.loadState = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
        }
    }

    /// Test-only: awaits the in-flight `onAppear`-triggered load, if any.
    func waitForLoad() async { await loadTask?.value }
}
