import Foundation
import os

// TEMP DIAGNOSTIC (Phase 5 Vault race triage) — remove once fix is verified.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "WishlistViewModel")

/// Drives `WishlistView`: loads `GET /api/v1/wishlist` via
/// `CollectionServicing`. Mirrors `ShelfViewModel`'s appear/refresh/
/// sync-revision pattern.
@MainActor
final class WishlistViewModel: ObservableObject {
    @Published private(set) var items: [WishlistItem] = []
    @Published private(set) var loadState: CollectionLoadState = .idle

    private let service: CollectionServicing
    private var loadTask: Task<Void, Never>?
    private var loadedRevision: Int?

    init(service: CollectionServicing = CollectionService()) {
        self.service = service
    }

    func onAppear() {
        let currentRevision = CollectionSyncCenter.shared.revision
        if loadState == .idle {
            diagLog.debug("onAppear reason=idleFirstLoad revision=\(currentRevision, privacy: .public)")
            load()
        } else if loadedRevision != currentRevision {
            diagLog.debug("onAppear reason=revisionChanged loadedRevision=\(self.loadedRevision ?? -1, privacy: .public) currentRevision=\(currentRevision, privacy: .public)")
            load()
        } else {
            diagLog.debug("onAppear reason=skip-upToDate revision=\(currentRevision, privacy: .public)")
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
        diagLog.debug("performLoad.start revisionAtStart=\(revisionAtStart, privacy: .public)")
        do {
            let items = try await service.fetchWishlist()
            self.items = items
            self.loadedRevision = revisionAtStart
            self.loadState = items.isEmpty ? .empty : .loaded
            diagLog.debug("performLoad.success itemCount=\(items.count, privacy: .public) loadedRevision=\(revisionAtStart, privacy: .public)")
        } catch {
            diagLog.error("performLoad.failure error=\(String(describing: error), privacy: .public)")
            self.loadState = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
        }
    }

    /// Test-only: awaits the in-flight `onAppear`-triggered load, if any.
    func waitForLoad() async { await loadTask?.value }
}
