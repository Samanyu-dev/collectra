import XCTest
@testable import Collectra

/// `APIError` is the shared error-mapping layer every Phase 4 view model
/// funnels network failures through (`(error as? APIError)?.userMessage`),
/// so its status/code → user-facing-message contract matters well beyond
/// auth/profile (Phase 3's original scope) — these tests cover the codes
/// Catalog/CardDetail actually hit.
final class APIErrorTests: XCTestCase {
    private func body(_ code: APIErrorCode, message: String = "server message") -> APIErrorBody {
        APIErrorBody(error: .init(code: code, message: message))
    }

    func testNotFoundMapsToUserFriendlyNotFoundMessage() {
        let error = APIError.from(status: 404, body: body(.notFound))
        XCTAssertEqual(error.userMessage, "We couldn't find that.")
    }

    func testValidationErrorPassesServerMessageThrough() {
        let error = APIError.from(status: 400, body: body(.validationError, message: "`page` must be a positive integer."))
        XCTAssertEqual(error.userMessage, "`page` must be a positive integer.")
    }

    func testUnauthenticatedMapsToSessionExpiredMessage() {
        let error = APIError.from(status: 401, body: body(.unauthenticated))
        XCTAssertEqual(error.userMessage, "Your session has expired. Please sign in again.")
    }

    func testServerErrorAbove500WithNoBodyMapsToGenericServerMessage() {
        let error = APIError.from(status: 500, body: nil)
        XCTAssertEqual(error.userMessage, "Something went wrong on our end. Please try again.")
    }

    func testUnrecognizedNon5xxStatusWithNoBodyMapsToUnknown() {
        let error = APIError.from(status: 418, body: nil)
        XCTAssertEqual(error.userMessage, "Something went wrong. Please try again.")
    }

    func testUnrecognizedErrorCodeNeverLeaksRawServerMessage() {
        // Simulates a future backend error code this client doesn't know
        // about yet — must still fall back to a safe, generic message rather
        // than showing whatever raw string the server sent.
        let error = APIError.from(status: 500, body: body(.internalError, message: "Prisma: P2002 unique constraint failed on the fields: (`email`)"))
        XCTAssertEqual(error.userMessage, "Something went wrong on our end. Please try again.")
    }

    func testDecodingAndNetworkErrorsAreNeverBlank() {
        XCTAssertFalse(APIError.decoding(FixtureError(message: "x")).userMessage.isEmpty)
        XCTAssertFalse(APIError.network(FixtureError(message: "x")).userMessage.isEmpty)
    }

    // Added for Phase 6C — .paywall previously didn't exist at all, so a real
    // 402 PAYWALL response (already returned by the shipped quantity route)
    // silently fell through to .unknown's generic message instead of an
    // upgrade prompt. These lock in the fix.

    func testPaywallSetLimitMapsToSetLimitUpgradeMessage() {
        let error = APIError.from(status: 402, body: body(.paywall, message: "PAYWALL_SET_LIMIT"))
        XCTAssertTrue(error.isPaywall)
        XCTAssertEqual(error.userMessage, "Free accounts can track cards from up to 4 different sets. Upgrade to Pro for unlimited sets.")
    }

    func testPaywallScanLimitMapsToScanLimitUpgradeMessage() {
        let error = APIError.from(status: 402, body: body(.paywall, message: "PAYWALL_SCAN_LIMIT"))
        XCTAssertTrue(error.isPaywall)
        XCTAssertEqual(error.userMessage, "You've used all 25 free scans for this week. Upgrade to Pro for unlimited scanning.")
    }

    func testPaywallWithUnrecognizedReasonStillFlagsAsPaywall() {
        let error = APIError.from(status: 402, body: body(.paywall, message: "PAYWALL_SOMETHING_NEW"))
        XCTAssertTrue(error.isPaywall)
        XCTAssertEqual(error.userMessage, "Upgrade to Pro to continue.")
    }

    func testNonPaywallErrorsAreNotFlaggedAsPaywall() {
        XCTAssertFalse(APIError.from(status: 404, body: body(.notFound)).isPaywall)
    }
}
