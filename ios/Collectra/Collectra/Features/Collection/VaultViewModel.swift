import Foundation
import os

// TEMP DIAGNOSTIC (Phase 5 Vault race triage) — remove once fix is verified.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "VaultViewModel")

/// Drives `VaultView`: loads `GET /api/v1/vault` via `CollectionServicing`.
/// Mirrors `ShelfViewModel`'s appear/refresh/sync-revision pattern; no
/// timeout wrapper here since Vault's query is unrelated to the
/// `/api/v1/shelf` performance issue Phase 5 investigated.
@MainActor
final class VaultViewModel: ObservableObject {
    @Published private(set) var items: [VaultItem] = []
    @Published private(set) var totalVaultValue: Double = 0
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
            let response = try await service.fetchVault()
            self.items = response.items
            self.totalVaultValue = response.totalVaultValue
            self.loadedRevision = revisionAtStart
            self.loadState = response.items.isEmpty ? .empty : .loaded
            diagLog.debug("performLoad.success itemCount=\(response.items.count, privacy: .public) loadedRevision=\(revisionAtStart, privacy: .public)")
        } catch {
            diagLog.error("performLoad.failure error=\(String(describing: error), privacy: .public)")
            self.loadState = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
        }
    }

    /// Test-only: awaits the in-flight `onAppear`-triggered load, if any.
    func waitForLoad() async { await loadTask?.value }
}
