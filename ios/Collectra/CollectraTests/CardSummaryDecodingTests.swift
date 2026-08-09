import XCTest
@testable import Collectra

/// Decoding tests against the exact JSON shape `GET /api/v1/cards` returns
/// (src/app/api/v1/cards/route.ts) — confirmed against the live endpoint
/// during this phase's implementation, not guessed.
final class CardSummaryDecodingTests: XCTestCase {
    func testDecodesFullCardSummary() throws {
        let json = """
        {
            "id": "pkmn-basep-24",
            "name": "Pikachu",
            "number": "24",
            "setId": "pkmn-basep",
            "setName": "Wizards Black Star Promos",
            "franchiseName": "Pokémon",
            "images": [{ "url": "https://example.com/a.png", "type": "OFFICIAL_ARTWORK" }],
            "price": {
                "valueUsd": 299.06,
                "confidenceLabel": "HIGH",
                "observationCount": 12,
                "lastUpdated": "2026-07-22T00:00:00.000Z",
                "sources": ["pokemontcg-api"],
                "trend30dPercent": null,
                "lowUsd": 346.43,
                "highUsd": 385.53,
                "soldAverageUsd": 299.06
            },
            "ownedQuantity": 2
        }
        """

        let card = try JSONFixtures.decode(CardSummary.self, from: json)

        XCTAssertEqual(card.id, "pkmn-basep-24")
        XCTAssertEqual(card.name, "Pikachu")
        XCTAssertEqual(card.franchiseName, "Pokémon")
        XCTAssertEqual(card.images.count, 1)
        XCTAssertEqual(card.primaryImageURL?.absoluteString, "https://example.com/a.png")
        XCTAssertEqual(card.price.confidenceLabel, .high)
        XCTAssertTrue(card.price.hasValue)
        XCTAssertEqual(card.ownedQuantity, 2)
    }

    func testDecodesNoDataPriceAndMissingImagesWithoutFabricatingValues() throws {
        let json = """
        {
            "id": "x", "name": "X", "number": "1", "setId": "s", "setName": "S", "franchiseName": "F",
            "images": [],
            "price": { "valueUsd": null, "confidenceLabel": "NO_DATA", "observationCount": 0, "lastUpdated": null, "sources": [] },
            "ownedQuantity": 0
        }
        """

        let card = try JSONFixtures.decode(CardSummary.self, from: json)

        XCTAssertNil(card.primaryImageURL)
        XCTAssertFalse(card.price.hasValue)
        XCTAssertEqual(card.price.confidenceLabel, .noData)
        XCTAssertNil(card.price.valueUsd)
    }

    func testDecodesCardListResponseWithPaginationMeta() throws {
        let json = """
        {
            "items": [],
            "pagination": { "page": 2, "pageSize": 30, "total": 65, "totalPages": 3 }
        }
        """

        let response = try JSONFixtures.decode(CardListResponse.self, from: json)

        XCTAssertEqual(response.pagination.page, 2)
        XCTAssertEqual(response.pagination.total, 65)
        XCTAssertFalse(response.pagination.isLastPage)
    }

    func testPaginationMetaIsLastPage() throws {
        let last = try JSONFixtures.decode(PaginationMeta.self, from: """
        { "page": 3, "pageSize": 30, "total": 65, "totalPages": 3 }
        """)
        XCTAssertTrue(last.isLastPage)

        let notLast = try JSONFixtures.decode(PaginationMeta.self, from: """
        { "page": 1, "pageSize": 30, "total": 65, "totalPages": 3 }
        """)
        XCTAssertFalse(notLast.isLastPage)
    }
}
