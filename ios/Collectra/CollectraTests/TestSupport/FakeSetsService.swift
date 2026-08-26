import Foundation
@testable import Collectra

/// Fake `SetsServicing` for `SetsViewModel`/`SetDetailViewModel` tests — same
/// call-order queueing approach as `FakeCatalogService` (see its doc comment).
actor FakeSetsService: SetsServicing {
    struct Call: Equatable {
        let query: String
        let page: Int
        let pageSize: Int
    }

    private(set) var calls: [Call] = []
    private var responses: [Result<SetListResponse, Error>] = []
    private var index = 0
    private var detailResult: Result<SetDetail, Error>?

    func stub(_ responses: [Result<SetListResponse, Error>]) {
        self.responses = responses
        self.index = 0
    }

    func stubDetail(_ result: Result<SetDetail, Error>) {
        detailResult = result
    }

    func fetchSets(query: String, page: Int, pageSize: Int) async throws -> SetListResponse {
        calls.append(Call(query: query, page: page, pageSize: pageSize))
        guard index < responses.count else {
            return SetListResponse(
                items: [],
                pagination: PaginationMeta(page: page, pageSize: pageSize, total: 0, totalPages: 1)
            )
        }
        let result = responses[index]
        index += 1
        return try result.get()
    }

    func fetchSetDetail(id: String) async throws -> SetDetail {
        guard let detailResult else {
            throw FixtureError(message: "FakeSetsService not stubbed for detail")
        }
        return try detailResult.get()
    }
}
