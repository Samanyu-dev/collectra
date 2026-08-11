import AVFoundation
@testable import Collectra

/// Fake `CameraServicing` for ScanViewModel tests. A plain class with manual
/// `Sendable` opt-out (like the real `CameraService`) rather than an actor —
/// `captureSession` is a synchronous protocol requirement, and tests only
/// ever touch this from the MainActor test method sequentially, so there's
/// no real concurrent-access hazard to guard against here.
final class FakeCameraService: CameraServicing, @unchecked Sendable {
    let captureSession = AVCaptureSession()

    var startResult: Result<Void, Error> = .success(())
    var capturePhotoResult: Result<Data, Error> = .success(Data([0xFF, 0xD8, 0xFF]))

    private(set) var startCallCount = 0
    private(set) var stopCallCount = 0
    private(set) var capturePhotoCallCount = 0

    func start() async throws {
        startCallCount += 1
        try startResult.get()
    }

    func stop() {
        stopCallCount += 1
    }

    func capturePhoto() async throws -> Data {
        capturePhotoCallCount += 1
        return try capturePhotoResult.get()
    }
}
