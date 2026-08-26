import Foundation

/// Abstraction over "fetch a page of the catalog" — lets CatalogViewModel be
/// unit-tested against a fake without hitting the network, while the real
/// implementation still goes through the one shared APIClient (Phase 4
/// architecture: View → ViewModel → Catalog/Card service → APIClient →
/// `/api/v1`; no feature is allowed a second networking layer).
protocol CatalogServicing: Sendable {
    func fetchCards(query: String, setId: String?, page: Int, pageSize: Int) async throws -> CardListResponse
}

extension CatalogServicing {
    /// Convenience for the common case (no set scope) — keeps every existing
    /// call site that only ever browsed the whole catalog unchanged.
    func fetchCards(query: String, page: Int, pageSize: Int) async throws -> CardListResponse {
        try await fetchCards(query: query, setId: nil, page: page, pageSize: pageSize)
    }
}

/// Talks to `GET /api/v1/cards` (src/app/api/v1/cards/route.ts). The only
/// place that knows this endpoint's query-param names.
struct CatalogService: CatalogServicing {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchCards(query: String, setId: String?, page: Int, pageSize: Int) async throws -> CardListResponse {
        var params: [String: String] = ["page": String(page), "pageSize": String(pageSize)]
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { params["query"] = trimmed }
        if let setId { params["setId"] = setId }
        return try await client.get("/api/v1/cards", query: params)
    }
}
