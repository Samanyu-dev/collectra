import Foundation

/// Abstraction over "fetch a page of sets" — same reasoning as
/// `CatalogServicing`: lets `SetsViewModel` be unit-tested against a fake.
protocol SetsServicing: Sendable {
    func fetchSets(query: String, page: Int, pageSize: Int) async throws -> SetListResponse
    func fetchSetDetail(id: String) async throws -> SetDetail
}

/// Talks to `GET /api/v1/sets` and `GET /api/v1/sets/[id]`
/// (src/app/api/v1/sets/route.ts, src/app/api/v1/sets/[id]/route.ts).
struct SetsService: SetsServicing {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchSets(query: String, page: Int, pageSize: Int) async throws -> SetListResponse {
        var params: [String: String] = ["page": String(page), "pageSize": String(pageSize)]
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { params["query"] = trimmed }
        return try await client.get("/api/v1/sets", query: params)
    }

    func fetchSetDetail(id: String) async throws -> SetDetail {
        try await client.get("/api/v1/sets/\(id)")
    }
}
