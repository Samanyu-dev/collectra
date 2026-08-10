import XCTest
@testable import Collectra

final class WithTimeoutTests: XCTestCase {
    func testReturnsOperationResultWhenFasterThanTimeout() async throws {
        let result = try await withTimeout(seconds: 5) { 42 }
        XCTAssertEqual(result, 42)
    }

    func testThrowsTimeoutErrorWhenOperationOutlastsDeadline() async {
        do {
            _ = try await withTimeout(seconds: 0) {
                try await Task.sleep(nanoseconds: 1_000_000_000)
                return 1
            }
            XCTFail("expected TimeoutError")
        } catch is TimeoutError {
            // expected
        } catch {
            XCTFail("expected TimeoutError, got \(error)")
        }
    }
}
