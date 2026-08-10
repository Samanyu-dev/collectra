import Foundation
import os

// TEMP DIAGNOSTIC (Phase 5 Vault race triage) — remove once fix is verified.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "ShelfViewModel")

/// Drives `ShelfView`: loads `GET /api/v1/shelf/collection` via
/// `CollectionServicing`. Bounded by a timeout so a slow/degenerate response
/// never leaves the UI looking frozen (Phase 5 requirement §15 — the
/// original `/api/v1/shelf` measured 10-27s on a large real collection; the
/// lean endpoint this calls is materially cheaper but still not
/// instantaneous for a big collection, since the dominant cost is the
/// unavoidable `instance.findMany` join itself). Re-fetches on appear only
/// when `CollectionSyncCenter` shows something has actually changed since
/// the last successful load, not on every tab switch.
@MainActor
final class ShelfViewModel: ObservableObject {
    @Published private(set) var items: [ShelfItem] = []
    @Published private(set) var loadState: CollectionLoadState = .idle

    private let service: CollectionServicing
    private let timeoutSeconds: UInt64
    private var loadTask: Task<Void, Never>?
    private var loadedRevision: Int?

    init(service: CollectionServicing = CollectionService(), timeoutSeconds: UInt64 = 30) {
        self.service = service
        self.timeoutSeconds = timeoutSeconds
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

    /// No-ops if a load is already in flight — avoids duplicate concurrent
    /// requests to an endpoint expensive enough that two at once is a real
    /// cost, not just wasted bandwidth.
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
            let items = try await withTimeout(seconds: timeoutSeconds) {
                try await self.service.fetchShelf()
            }
            self.items = items
            self.loadedRevision = revisionAtStart
            self.loadState = items.isEmpty ? .empty : .loaded
            diagLog.debug("performLoad.success itemCount=\(items.count, privacy: .public) loadedRevision=\(revisionAtStart, privacy: .public)")
        } catch is TimeoutError {
            diagLog.error("performLoad.timeout")
            self.loadState = .error("This is taking longer than expected. Please try again.")
        } catch {
            diagLog.error("performLoad.failure error=\(String(describing: error), privacy: .public)")
            self.loadState = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
        }
    }

    /// Test-only: awaits the in-flight `onAppear`-triggered load, if any.
    func waitForLoad() async { await loadTask?.value }
}
