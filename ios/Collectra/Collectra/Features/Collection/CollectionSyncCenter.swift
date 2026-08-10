import Foundation
import os

// TEMP DIAGNOSTIC (Phase 5 Vault race triage) — remove once fix is verified.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "CollectionSyncCenter")

/// The single, minimal piece of shared state Phase 5's cross-screen sync
/// needs — not a general state-management framework, just a revision
/// counter. `CardDetailViewModel` calls `markChanged()` after any
/// successful quantity/favorite/vault/wishlist mutation; `ShelfViewModel` /
/// `VaultViewModel` / `WishlistViewModel` each remember the revision they
/// last successfully loaded at and compare it here on appear, refetching
/// only when something has actually changed since (Phase 5 requirement
/// §11: keep Shelf/Vault/Wishlist/Card-Detail from silently drifting apart,
/// without re-hitting the still-nontrivially-expensive Shelf endpoint on
/// every tab switch when nothing changed).
@MainActor
final class CollectionSyncCenter {
    static let shared = CollectionSyncCenter()

    private(set) var revision = 0

    private init() {}

    func markChanged() {
        revision += 1
        diagLog.debug("markChanged newRevision=\(self.revision, privacy: .public)")
    }
}
