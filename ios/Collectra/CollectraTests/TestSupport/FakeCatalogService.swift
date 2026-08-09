import Foundation
@testable import Collectra

/// Fake `CatalogServicing` for `CatalogViewModel` tests — an `actor` so it's
/// trivially `Sendable` (required by the `CatalogServicing: Sendable`
/// protocol) and safe to call from the view model's internal `Task`s.
/// Queues canned responses in call order rather than keying by page, so a
/// test can script exactly what a real backend would return across a
/// sequence of requests (page 1 success, page 2 failure, etc).
actor FakeCatalogService: CatalogServicing {
    struct Call: Equatable {
        let query: String
        let page: Int
        let pageSize: Int
    }

    private(set) var calls: [Call] = []
    private var responses: [Result<CardListResponse, Error>] = []
    private var index = 0

    func stub(_ responses: [Result<CardListResponse, Error>]) {
        self.responses = responses
        self.index = 0
    }

    func fetchCards(query: String, page: Int, pageSize: Int) async throws -> CardListResponse {
        calls.append(Call(query: query, page: page, pageSize: pageSize))
        guard index < responses.count else {
            return CardListResponse(
                items: [],
                pagination: PaginationMeta(page: page, pageSize: pageSize, total: 0, totalPages: 1)
            )
        }
        let result = responses[index]
        index += 1
        return try result.get()
    }
}

/// Fake `CardDetailServicing` for `CardDetailViewModel` tests.
actor FakeCardDetailService: CardDetailServicing {
    private(set) var requestedIds: [String] = []
    private var result: Result<CardDetail, Error>?

    func stub(_ result: Result<CardDetail, Error>) {
        self.result = result
    }

    func fetchCardDetail(id: String) async throws -> CardDetail {
        requestedIds.append(id)
        guard let result else {
            throw FixtureError(message: "FakeCardDetailService not stubbed")
        }
        return try result.get()
    }
}
