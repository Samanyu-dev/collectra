import AVFoundation
import Foundation
import os

private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "ScanViewModel")

/// Drives `ScanView` through Phase 6C/6D's slice: quota gate → permission →
/// camera → capture → upload → response received. STOP — this phase
/// explicitly does not build candidate/confirmation/variant-selection UI or
/// touch the collection; see ScanState's doc comment.
///
/// The server is the only source of truth for scan entitlement — this class
/// never maintains its own scan counter or decides "allowed"/"denied" from
/// anything except what `ScanServicing.quotaStatus()` returns (mirrors
/// entitlements.ts's server-authoritative design; see PaywallReason in
/// APIError.swift for the same principle already applied to the Phase 5
/// set-limit paywall).
@MainActor
final class ScanViewModel: ObservableObject {
    @Published private(set) var state: ScanState = .checkingQuota

    private let scanService: ScanServicing
    private let cameraService: CameraServicing
    private let cameraAuthorizer: CameraAuthorizing

    /// Tracks the in-flight start()/performCapture() Task so tests can await
    /// completion deterministically — mirrors ShelfViewModel's loadTask/
    /// waitForLoad() pattern.
    private var currentTask: Task<Void, Never>?

    /// Exposed for the view's `UIViewRepresentable` camera preview binding.
    var captureSession: AVCaptureSession { cameraService.captureSession }

    init(
        scanService: ScanServicing = ScanService(),
        cameraService: CameraServicing = CameraService(),
        cameraAuthorizer: CameraAuthorizing = AVCameraAuthorizer()
    ) {
        self.scanService = scanService
        self.cameraService = cameraService
        self.cameraAuthorizer = cameraAuthorizer
    }

    /// Call when the Scan screen appears — never at app launch (Phase 6C §5:
    /// permission is requested only once the user has intentionally entered
    /// Scan, not proactively).
    func onAppear() {
        currentTask = Task { await start() }
    }

    func onDisappear() {
        cameraService.stop()
    }

    func cancel() {
        cameraService.stop()
        state = .cancelled
    }

    func capture() {
        guard case .ready = state else { return }
        currentTask = Task { await performCapture() }
    }

    func retry() {
        currentTask = Task { await start() }
    }

    /// Test-only: awaits the in-flight onAppear/capture/retry-triggered work, if any.
    func waitForCurrentWork() async {
        await currentTask?.value
    }

    private func start() async {
        state = .checkingQuota
        diagLog.debug("start.checkingQuota")
        let quota: ScanQuotaStatus
        do {
            quota = try await scanService.quotaStatus()
        } catch {
            diagLog.error("start.quotaCheckFailed error=\(String(describing: error), privacy: .public)")
            state = .error((error as? APIError)?.userMessage ?? "Couldn't check your scan quota. Please try again.")
            return
        }

        guard quota.canScan else {
            diagLog.debug("start.quotaBlocked scansUsedThisWeek=\(quota.scansUsedThisWeek, privacy: .public)")
            state = .quotaBlocked(quota)
            return
        }

        await checkPermissionAndStartCamera()
    }

    private func checkPermissionAndStartCamera() async {
        state = .checkingPermission
        switch cameraAuthorizer.currentStatus() {
        case .authorized:
            await startCamera()
        case .notDetermined:
            let granted = await cameraAuthorizer.requestAccess()
            if granted {
                await startCamera()
            } else {
                diagLog.debug("permission.deniedAfterPrompt")
                state = .permissionDenied
            }
        case .denied:
            diagLog.debug("permission.previouslyDenied")
            state = .permissionDenied
        case .restricted:
            diagLog.debug("permission.restricted")
            state = .permissionRestricted
        }
    }

    private func startCamera() async {
        do {
            try await cameraService.start()
            state = .ready
        } catch {
            diagLog.error("camera.startFailed error=\(String(describing: error), privacy: .public)")
            state = .cameraUnavailable((error as? CameraError)?.errorDescription ?? "Camera unavailable. Please try again.")
        }
    }

    private func performCapture() async {
        state = .capturing
        do {
            let raw = try await cameraService.capturePhoto()

            state = .preparingImage
            let prepared = try ScanImagePreparation.prepareForUpload(raw)

            state = .uploading
            let response = try await scanService.identify(imageData: prepared, mimeType: "image/jpeg")
            diagLog.debug("capture.received ocrConfigured=\(response.ocrConfigured, privacy: .public) mediaId=\(response.mediaId, privacy: .public)")
            state = .received(response)
        } catch {
            diagLog.error("capture.failed error=\(String(describing: error), privacy: .public)")
            let message = (error as? APIError)?.userMessage
                ?? (error as? CameraError)?.errorDescription
                ?? (error as? ScanImagePreparation.PreparationError)?.errorDescription
                ?? "Something went wrong. Please try again."
            state = .error(message)
        }
    }
}
