import XCTest
@testable import Collectra

/// Locks in the discriminated-union shape of `IdentifyScanResponse`
/// (src/lib/actions/scanner.ts): when `ocrConfigured` is false, the backend
/// sends none of the other fields at all — this must decode cleanly rather
/// than throwing a `keyNotFound` error.
final class ScanModelsDecodingTests: XCTestCase {
    func testOcrNotConfiguredResponseDecodesWithAllOptionalFieldsNil() throws {
        let json = """
        {"ocrConfigured": false, "mediaId": "media-1", "previewUrl": "https://example.com/p.jpg"}
        """
        let response = try JSONFixtures.decode(ScanIdentifyResponse.self, from: json)

        XCTAssertFalse(response.ocrConfigured)
        XCTAssertNil(response.confidenceLabel)
        XCTAssertNil(response.confidence)
        XCTAssertNil(response.reasons)
        XCTAssertNil(response.resolved)
        XCTAssertNil(response.candidates)
        XCTAssertEqual(response.mediaId, "media-1")
    }

    func testResolvedHighConfidenceResponseDecodesFully() throws {
        let json = """
        {
          "ocrConfigured": true,
          "confidenceLabel": "HIGH",
          "confidence": 0.92,
          "reasons": ["exact number match"],
          "extractedName": "Charizard",
          "extractedCardNumber": "4",
          "resolved": {
            "variantId": "v1",
            "confidence": 0.92,
            "cardName": "Charizard",
            "cardNumber": "4",
            "setName": "Base Set",
            "imageUrl": "https://example.com/card.jpg"
          },
          "candidates": [],
          "mediaId": "media-2",
          "previewUrl": "https://example.com/p2.jpg"
        }
        """
        let response = try JSONFixtures.decode(ScanIdentifyResponse.self, from: json)

        XCTAssertTrue(response.ocrConfigured)
        XCTAssertEqual(response.confidenceLabel, "HIGH")
        XCTAssertEqual(response.resolved?.variantId, "v1")
        XCTAssertEqual(response.resolved?.cardName, "Charizard")
        XCTAssertEqual(response.candidates, [])
    }

    func testMultipleCandidatesResponseDecodesWithNoResolvedMatch() throws {
        let json = """
        {
          "ocrConfigured": true,
          "confidenceLabel": "MEDIUM",
          "confidence": 0.5,
          "reasons": [],
          "extractedName": null,
          "extractedCardNumber": null,
          "resolved": null,
          "candidates": [
            {"variantId": "v1", "confidence": 0.5, "cardName": "Card A", "cardNumber": "1", "setName": "Set", "imageUrl": null},
            {"variantId": "v2", "confidence": 0.4, "cardName": "Card B", "cardNumber": "2", "setName": "Set", "imageUrl": null}
          ],
          "mediaId": "media-3",
          "previewUrl": "https://example.com/p3.jpg"
        }
        """
        let response = try JSONFixtures.decode(ScanIdentifyResponse.self, from: json)

        XCTAssertNil(response.resolved)
        XCTAssertEqual(response.candidates?.count, 2)
        XCTAssertEqual(response.candidates?.map(\.variantId), ["v1", "v2"])
    }

    func testScanQuotaStatusDecodes() throws {
        let json = """
        {"isPro": false, "canScan": true, "scansUsedThisWeek": 10, "scanLimitPerWeek": 25}
        """
        let status = try JSONFixtures.decode(ScanQuotaStatus.self, from: json)

        XCTAssertFalse(status.isPro)
        XCTAssertTrue(status.canScan)
        XCTAssertEqual(status.scansUsedThisWeek, 10)
        XCTAssertEqual(status.scanLimitPerWeek, 25)
    }
}
