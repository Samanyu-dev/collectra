import XCTest
@testable import Collectra

final class PriceHistoryDecodingTests: XCTestCase {
    func testEmptyPriceHistoryDecodesWithoutFabricatingPoints() throws {
        let json = """
        { "points": [], "trend": "flat", "trendPercent": null, "lowestPrice": null, "highestPrice": null, "averagePrice": null, "lastUpdated": null, "observationCount": 0 }
        """

        let result = try JSONFixtures.decode(PriceHistoryResult.self, from: json)

        XCTAssertTrue(result.points.isEmpty)
        XCTAssertEqual(result.trend, "flat")
        XCTAssertNil(result.lastUpdated)
    }

    func testGradedPriceHistoryDecodesMultipleSeriesDataDriven() throws {
        let json = """
        {
            "companies": ["PSA", "BGS"],
            "series": [
                { "company": "PSA", "grade": "10", "label": "PSA 10", "points": [{ "date": "2026-07-01T00:00:00.000Z", "priceUsd": 100 }], "latestPriceUsd": 100 },
                { "company": "BGS", "grade": "9.5", "label": "BGS 9.5", "points": [], "latestPriceUsd": null }
            ],
            "observationCount": 1,
            "lastUpdated": "2026-07-01T00:00:00.000Z"
        }
        """

        let result = try JSONFixtures.decode(GradedPriceHistoryResult.self, from: json)

        XCTAssertEqual(result.companies, ["PSA", "BGS"])
        XCTAssertEqual(result.series.count, 2)
        XCTAssertEqual(result.series[0].id, "PSA::10")
        XCTAssertEqual(result.series[1].points.count, 0)
    }

    func testUnrecognizedConfidenceLabelFallsBackToUnknownRatherThanCrashing() throws {
        let json = """
        { "valueUsd": 5.0, "confidenceLabel": "SOMETHING_NEW", "observationCount": 1, "lastUpdated": null, "sources": [] }
        """

        let price = try JSONFixtures.decode(PriceDisplay.self, from: json)

        XCTAssertEqual(price.confidenceLabel, .unknown)
        XCTAssertTrue(price.hasValue)
    }

    func testMissingOptionalTrendFieldsDecodeAsNil() throws {
        // Mirrors a caller that omits keys entirely rather than sending explicit
        // nulls — both must decode the same way since PriceDisplay's optional
        // fields are all `Double?`.
        let json = """
        { "valueUsd": 1.0, "confidenceLabel": "LOW", "observationCount": 1, "lastUpdated": null, "sources": [] }
        """

        let price = try JSONFixtures.decode(PriceDisplay.self, from: json)

        XCTAssertNil(price.trend30dPercent)
        XCTAssertNil(price.lowUsd)
        XCTAssertNil(price.highUsd)
        XCTAssertNil(price.soldAverageUsd)
    }
}
