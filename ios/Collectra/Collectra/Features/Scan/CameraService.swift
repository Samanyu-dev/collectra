import AVFoundation

enum CameraError: Error, LocalizedError {
    case deviceUnavailable
    case configurationFailed
    case captureFailed

    var errorDescription: String? {
        switch self {
        case .deviceUnavailable:
            return "No camera is available. This is expected in Simulator — a physical device is needed to test real capture."
        case .configurationFailed:
            return "Couldn't start the camera. Please try again."
        case .captureFailed:
            return "Couldn't capture a photo. Please try again."
        }
    }
}

/// Abstraction over camera session lifecycle + capture, so `ScanViewModel`'s
/// state-machine logic (Phase 6C §6/§7) is unit-testable without a real
/// `AVCaptureSession` — Simulator has no camera hardware at all, so real
/// capture can only ever be exercised on a physical device (see the
/// Phase 6C report's Simulator-vs-device verification split).
protocol CameraServicing: Sendable {
    var captureSession: AVCaptureSession { get }
    func start() async throws
    func stop()
    func capturePhoto() async throws -> Data
}

/// Owns the AVCaptureSession lifecycle — the only thing in this app that
/// touches AVFoundation directly, mirroring APIClient's "one thing owns this
/// concern" convention. All session configuration/start/stop/capture happens
/// on a private serial queue, never the main actor — AVCaptureSession's own
/// methods are blocking calls Apple's own guidance says never to run on main.
final class CameraService: NSObject, CameraServicing, @unchecked Sendable {
    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "com.collectra.camera.session")
    private let photoOutput = AVCapturePhotoOutput()
    private var isConfigured = false
    private var captureContinuation: CheckedContinuation<Data, Error>?

    /// Exposed read-only so a SwiftUI `UIViewRepresentable` can bind an
    /// `AVCaptureVideoPreviewLayer` to the same session this class drives —
    /// never mutated from outside this class.
    var captureSession: AVCaptureSession { session }

    func start() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            sessionQueue.async { [weak self] in
                guard let self else { continuation.resume(); return }
                do {
                    if !self.isConfigured {
                        try self.configureSession()
                        self.isConfigured = true
                    }
                    if !self.session.isRunning {
                        self.session.startRunning()
                    }
                    continuation.resume()
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
        }
    }

    private func configureSession() throws {
        // Simulator has no capture devices at all — this throws
        // .deviceUnavailable there every time, which is the real, correct,
        // testable behavior for "no camera," not a special-cased hack.
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
            ?? AVCaptureDevice.default(for: .video)
        else {
            throw CameraError.deviceUnavailable
        }

        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .photo

        guard let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else {
            throw CameraError.configurationFailed
        }
        session.addInput(input)

        guard session.canAddOutput(photoOutput) else {
            throw CameraError.configurationFailed
        }
        session.addOutput(photoOutput)

        // App is portrait-only (Info.plist UISupportedInterfaceOrientations),
        // so lock capture orientation to portrait rather than tracking device
        // rotation — keeps EXIF orientation on the captured JPEG correct
        // without a rotation-coordinator round trip this app doesn't need yet.
        if let connection = photoOutput.connection(with: .video), connection.isVideoRotationAngleSupported(90) {
            connection.videoRotationAngle = 90
        }
    }

    func capturePhoto() async throws -> Data {
        guard session.isRunning else { throw CameraError.deviceUnavailable }
        return try await withCheckedThrowingContinuation { continuation in
            sessionQueue.async { [weak self] in
                guard let self else {
                    continuation.resume(throwing: CameraError.captureFailed)
                    return
                }
                self.captureContinuation = continuation
                self.photoOutput.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
            }
        }
    }
}

extension CameraService: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            let continuation = self.captureContinuation
            self.captureContinuation = nil

            if error != nil {
                continuation?.resume(throwing: CameraError.captureFailed)
                return
            }
            guard let data = photo.fileDataRepresentation() else {
                continuation?.resume(throwing: CameraError.captureFailed)
                return
            }
            continuation?.resume(returning: data)
        }
    }
}
