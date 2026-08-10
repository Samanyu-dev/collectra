import Foundation

struct TimeoutError: Error {}

/// Races `operation` against a timer — used for reads that could otherwise
/// hang indefinitely (Phase 5 requirement §15: Shelf must never leave the UI
/// looking frozen, even against a slow endpoint). Whichever loses is
/// cancelled, so no orphaned work keeps running past the timeout.
func withTimeout<T: Sendable>(seconds: UInt64, operation: @escaping @Sendable () async throws -> T) async throws -> T {
    try await withThrowingTaskGroup(of: T.self) { group in
        group.addTask { try await operation() }
        group.addTask {
            try await Task.sleep(nanoseconds: seconds * 1_000_000_000)
            throw TimeoutError()
        }
        defer { group.cancelAll() }
        guard let result = try await group.next() else {
            throw TimeoutError()
        }
        return result
    }
}
