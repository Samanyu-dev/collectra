import XCTest
@testable import Collectra

/// Decoding + variant-display-name tests against the exact JSON shape
/// `GET /api/v1/cards/[id]` returns (src/app/api/v1/cards/[id]/route.ts),
/// confirmed against the live endpoint during this phase's implementation.
final class CardDetailDecodingTests: XCTestCase {
    private let sampleJSON = """
    {
        "id": "card-1",
        "name": "Test Card",
        "number": "24",
        "supertype": "Pokémon",
        "subtypes": "Basic",
        "hp": "50",
        "rules": null,
        "flavorText": "Flavor",
        "set": { "id": "set-1", "name": "Set One", "franchiseName": "Pokémon" },
        "images": [{ "url": "https://example.com/a.png", "type": "OFFICIAL_ARTWORK" }],
        "variants": [
            {
                "id": "v1",
                "printing": { "id": "p1", "name": "Base" },
                "parallel": { "id": "pa1", "name": "Holofoil" },
                "insert": null,
                "isFoil": true,
                "isAuto": false,
                "isPatch": false,
                "isRelic": false,
                "serialTo": null,
                "price": { "valueUsd": 10.0, "confidenceLabel": "HIGH", "observationCount": 3, "lastUpdated": null, "sources": [] },
                "priceHistory": {
                    "points": [
                        { "date": "2026-07-01T00:00:00.000Z", "priceUsd": 9.5, "source": "ebay", "kind": "SOLD" },
                        { "date": "2026-07-05T00:00:00.000Z", "priceUsd": 10.5, "source": "ebay", "kind": "SOLD" }
                    ],
                    "trend": "up",
                    "trendPercent": 5.2,
                    "lowestPrice": 9.5,
                    "highestPrice": 10.5,
                    "averagePrice": 10.0,
                    "lastUpdated": "2026-07-05T00:00:00.000Z",
                    "observationCount": 2
                },
                "gradedPriceHistory": {
                    "companies": ["PSA"],
                    "series": [
                        {
                            "company": "PSA",
                            "grade": "10",
                            "label": "PSA 10",
                            "points": [{ "date": "2026-07-01T00:00:00.000Z", "priceUsd": 50.0 }],
                            "latestPriceUsd": 50.0
                        }
                    ],
                    "observationCount": 1,
                    "lastUpdated": "2026-07-01T00:00:00.000Z"
                },
                "ownedQuantity": 1,
                "vaulted": false,
                "favorited": true
            },
            {
                "id": "v2",
                "printing": null, "parallel": null, "insert": { "id": "i1", "name": "Rare Holo" },
                "isFoil": false, "isAuto": true, "isPatch": false, "isRelic": true, "serialTo": 50,
                "price": { "valueUsd": null, "confidenceLabel": "NO_DATA", "observationCount": 0, "lastUpdated": null, "sources": [] },
                "priceHistory": null,
                "gradedPriceHistory": null,
                "ownedQuantity": 0, "vaulted": false, "favorited": false
            }
        ],
        "viewer": { "isWishlisted": true }
    }
    """

    func testDecodesFullCardDetail() throws {
        let detail = try JSONFixtures.decode(CardDetail.self, from: sampleJSON)

        XCTAssertEqual(detail.variants.count, 2)
        XCTAssertEqual(detail.viewer?.isWishlisted, true)
        XCTAssertEqual(detail.set.franchiseName, "Pokémon")
        XCTAssertEqual(detail.primaryImageURL?.absoluteString, "https://example.com/a.png")

        let v1 = detail.variants[0]
        XCTAssertEqual(v1.priceHistory?.points.count, 2)
        XCTAssertEqual(v1.gradedPriceHistory?.series.first?.label, "PSA 10")
        XCTAssertTrue(v1.favorited)
    }

    func testVariantWithNoDataOmitsHistoryRatherThanFabricatingIt() throws {
        let detail = try JSONFixtures.decode(CardDetail.self, from: sampleJSON)
        let v2 = detail.variants[1]

        XCTAssertNil(v2.priceHistory)
        XCTAssertNil(v2.gradedPriceHistory)
        XCTAssertFalse(v2.price.hasValue)
    }

    func testVariantDisplayNameCombinesPartsAndTags() throws {
        let detail = try JSONFixtures.decode(CardDetail.self, from: sampleJSON)

        XCTAssertEqual(detail.variants[0].displayName, "Holofoil · Base (Foil)")
        XCTAssertEqual(detail.variants[1].displayName, "Rare Holo (Auto, Relic, /50)")
    }

    func testVariantWithNoCategoriesFallsBackToBase() throws {
        let json = """
        {
            "id": "v3", "printing": null, "parallel": null, "insert": null,
            "isFoil": false, "isAuto": false, "isPatch": false, "isRelic": false, "serialTo": null,
            "price": { "valueUsd": null, "confidenceLabel": "NO_DATA", "observationCount": 0, "lastUpdated": null, "sources": [] },
            "priceHistory": null, "gradedPriceHistory": null,
            "ownedQuantity": 0, "vaulted": false, "favorited": false
        }
        """

        let variant = try JSONFixtures.decode(CardVariant.self, from: json)

        XCTAssertEqual(variant.displayName, "Base")
    }

    func testDecodesNullViewerForAnonymousCaller() throws {
        let json = sampleJSON.replacingOccurrences(
            of: "\"viewer\": { \"isWishlisted\": true }",
            with: "\"viewer\": null"
        )

        let detail = try JSONFixtures.decode(CardDetail.self, from: json)

        XCTAssertNil(detail.viewer)
    }
}
