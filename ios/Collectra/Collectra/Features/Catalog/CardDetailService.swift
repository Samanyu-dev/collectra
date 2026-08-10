import Foundation
import os

// TEMP DIAGNOSTIC (Phase 5 card-detail triage) — remove once root cause is fixed.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "CardDetailService")

/// Abstraction over "fetch one card's full detail" — mirrors
/// `CatalogServicing`'s role for `CardDetailViewModel`.
protocol CardDetailServicing: Sendable {
    func fetchCardDetail(id: String) async throws -> CardDetail
}

/// Talks to `GET /api/v1/cards/[id]` (src/app/api/v1/cards/[id]/route.ts).
/// Auth is optional on this endpoint server-side, but APIClient always
/// attaches whatever Bearer token is available — an authenticated caller
/// transparently gets the `viewer` block, no extra work here.
struct CardDetailService: CardDetailServicing {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchCardDetail(id: String) async throws -> CardDetail {
        diagLog.debug("fetchCardDetail.enter cardId=\(id, privacy: .public)")
        do {
            let detail: CardDetail = try await client.get("/api/v1/cards/\(id)")
            diagLog.debug("fetchCardDetail.success cardId=\(id, privacy: .public) variants=\(detail.variants.count, privacy: .public)")
            return detail
        } catch {
            diagLog.error("fetchCardDetail.failure cardId=\(id, privacy: .public) error=\(String(describing: error), privacy: .public)")
            throw error
        }
    }
}
