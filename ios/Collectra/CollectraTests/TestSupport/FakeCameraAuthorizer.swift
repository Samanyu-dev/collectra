@testable import Collectra

final class FakeCameraAuthorizer: CameraAuthorizing, @unchecked Sendable {
    var status: CameraAuthorizationStatus = .authorized
    var requestAccessResult = true
    private(set) var requestAccessCallCount = 0

    func currentStatus() -> CameraAuthorizationStatus { status }

    func requestAccess() async -> Bool {
        requestAccessCallCount += 1
        return requestAccessResult
    }
}
