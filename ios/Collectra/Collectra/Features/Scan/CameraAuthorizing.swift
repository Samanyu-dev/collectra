import AVFoundation

enum CameraAuthorizationStatus {
    case notDetermined
    case authorized
    case denied
    case restricted
}

/// Split out from CameraService so ScanViewModel's permission-state logic
/// (Phase 6C §5) is unit-testable without touching real AVFoundation
/// authorization APIs, which XCTest can't drive deterministically.
protocol CameraAuthorizing: Sendable {
    func currentStatus() -> CameraAuthorizationStatus
    /// Only ever call this from a state where the user has just intentionally
    /// entered Scan — never at app launch (see ScanViewModel's doc comment).
    func requestAccess() async -> Bool
}

struct AVCameraAuthorizer: CameraAuthorizing {
    func currentStatus() -> CameraAuthorizationStatus {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .notDetermined: return .notDetermined
        case .authorized: return .authorized
        case .denied: return .denied
        case .restricted: return .restricted
        @unknown default: return .denied
        }
    }

    func requestAccess() async -> Bool {
        await AVCaptureDevice.requestAccess(for: .video)
    }
}
