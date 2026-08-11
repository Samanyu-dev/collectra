import XCTest
@testable import Collectra

/// Covers Phase 6C/6D's state machine: quota gate → permission → camera →
/// capture → upload → received. The server is always the source of truth
/// for "can this user scan" here — these tests specifically lock in that a
/// blocked quota never reaches the camera at all (FakeCameraService.startCallCount == 0).
@MainActor
final class ScanViewModelTests: XCTestCase {
    private func makeViewModel(
        quota: Result<ScanQuotaStatus, Error> = .success(ScanQuotaStatus(isPro: false, canScan: true, scansUsedThisWeek: 5, scanLimitPerWeek: 25)),
        authStatus: CameraAuthorizationStatus = .authorized,
        requestAccessResult: Bool = true,
        cameraStartResult: Result<Void, Error> = .success(())
    ) async -> (ScanViewModel, FakeScanService, FakeCameraService, FakeCameraAuthorizer) {
        let scanService = FakeScanService()
        await scanService.stubQuota(quota)
        let cameraService = FakeCameraService()
        cameraService.startResult = cameraStartResult
        let authorizer = FakeCameraAuthorizer()
        authorizer.status = authStatus
        authorizer.requestAccessResult = requestAccessResult

        let viewModel = ScanViewModel(scanService: scanService, cameraService: cameraService, cameraAuthorizer: authorizer)
        return (viewModel, scanService, cameraService, authorizer)
    }

    // MARK: - Quota gate

    func testFreeUserWithinQuotaOpensCamera() async {
        let (viewModel, _, cameraService, _) = await makeViewModel()

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .ready = viewModel.state else {
            return XCTFail("expected .ready, got \(viewModel.state)")
        }
        XCTAssertEqual(cameraService.startCallCount, 1)
    }

    func testFreeUserQuotaExhaustedBlocksBeforeCameraOpens() async {
        let blockedStatus = ScanQuotaStatus(isPro: false, canScan: false, scansUsedThisWeek: 25, scanLimitPerWeek: 25)
        let (viewModel, _, cameraService, authorizer) = await makeViewModel(quota: .success(blockedStatus))

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .quotaBlocked(let quota) = viewModel.state else {
            return XCTFail("expected .quotaBlocked, got \(viewModel.state)")
        }
        XCTAssertEqual(quota.scansUsedThisWeek, 25)
        XCTAssertEqual(cameraService.startCallCount, 0, "camera must never start once quota is blocked")
        XCTAssertEqual(authorizer.requestAccessCallCount, 0, "permission must never even be checked once quota is blocked")
    }

    func testProUserAlwaysAllowedRegardlessOfScanCount() async {
        let proStatus = ScanQuotaStatus(isPro: true, canScan: true, scansUsedThisWeek: 0, scanLimitPerWeek: 25)
        let (viewModel, _, cameraService, _) = await makeViewModel(quota: .success(proStatus))

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .ready = viewModel.state else {
            return XCTFail("expected .ready, got \(viewModel.state)")
        }
        XCTAssertEqual(cameraService.startCallCount, 1)
    }

    func testQuotaCheckFailureSurfacesUserFacingError() async {
        let (viewModel, _, cameraService, _) = await makeViewModel(quota: .failure(FixtureError(message: "boom")))

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .error(let message) = viewModel.state else {
            return XCTFail("expected .error, got \(viewModel.state)")
        }
        XCTAssertFalse(message.isEmpty)
        XCTAssertEqual(cameraService.startCallCount, 0)
    }

    // MARK: - Permission

    func testNotDeterminedPermissionGrantedStartsCamera() async {
        let (viewModel, _, cameraService, authorizer) = await makeViewModel(authStatus: .notDetermined, requestAccessResult: true)

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .ready = viewModel.state else {
            return XCTFail("expected .ready, got \(viewModel.state)")
        }
        XCTAssertEqual(authorizer.requestAccessCallCount, 1)
        XCTAssertEqual(cameraService.startCallCount, 1)
    }

    func testNotDeterminedPermissionDeniedShowsPermissionDeniedState() async {
        let (viewModel, _, cameraService, _) = await makeViewModel(authStatus: .notDetermined, requestAccessResult: false)

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .permissionDenied = viewModel.state else {
            return XCTFail("expected .permissionDenied, got \(viewModel.state)")
        }
        XCTAssertEqual(cameraService.startCallCount, 0)
    }

    func testPreviouslyDeniedPermissionNeverPromptsAgain() async {
        let (viewModel, _, _, authorizer) = await makeViewModel(authStatus: .denied)

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .permissionDenied = viewModel.state else {
            return XCTFail("expected .permissionDenied, got \(viewModel.state)")
        }
        XCTAssertEqual(authorizer.requestAccessCallCount, 0, "must not re-prompt once already denied")
    }

    func testRestrictedPermissionShowsRestrictedState() async {
        let (viewModel, _, _, _) = await makeViewModel(authStatus: .restricted)

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .permissionRestricted = viewModel.state else {
            return XCTFail("expected .permissionRestricted, got \(viewModel.state)")
        }
    }

    // MARK: - Camera lifecycle

    func testCameraStartFailureShowsCameraUnavailableState() async {
        let (viewModel, _, _, _) = await makeViewModel(cameraStartResult: .failure(CameraError.deviceUnavailable))

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        guard case .cameraUnavailable(let message) = viewModel.state else {
            return XCTFail("expected .cameraUnavailable, got \(viewModel.state)")
        }
        XCTAssertFalse(message.isEmpty)
    }

    func testCancelStopsCameraAndSetsCancelledState() async {
        let (viewModel, _, cameraService, _) = await makeViewModel()
        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        viewModel.cancel()

        guard case .cancelled = viewModel.state else {
            return XCTFail("expected .cancelled, got \(viewModel.state)")
        }
        XCTAssertEqual(cameraService.stopCallCount, 1)
    }

    func testOnDisappearStopsCamera() async {
        let (viewModel, _, cameraService, _) = await makeViewModel()
        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        viewModel.onDisappear()

        XCTAssertEqual(cameraService.stopCallCount, 1)
    }

    // MARK: - Capture

    func testCaptureWhileNotReadyIsANoOp() async {
        let (viewModel, _, cameraService, _) = await makeViewModel(quota: .success(ScanQuotaStatus(isPro: false, canScan: false, scansUsedThisWeek: 25, scanLimitPerWeek: 25)))
        viewModel.onAppear()
        await viewModel.waitForCurrentWork()

        viewModel.capture()
        await viewModel.waitForCurrentWork()

        XCTAssertEqual(cameraService.capturePhotoCallCount, 0)
    }

    func testSuccessfulCaptureUploadsAndReachesReceivedState() async {
        let (viewModel, scanService, cameraService, _) = await makeViewModel()
        let response = ScanIdentifyResponse(
            ocrConfigured: true, confidenceLabel: "HIGH", confidence: 0.95, reasons: [],
            extractedName: "Charizard", extractedCardNumber: "4", resolved: nil, candidates: [],
            mediaId: "media-1", previewUrl: "https://example.com/preview.jpg"
        )
        await scanService.stubIdentify(.success(response))
        cameraService.capturePhotoResult = .success(fixtureJPEGData())

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()
        viewModel.capture()
        await viewModel.waitForCurrentWork()

        guard case .received(let received) = viewModel.state else {
            return XCTFail("expected .received, got \(viewModel.state)")
        }
        XCTAssertEqual(received.mediaId, "media-1")
        XCTAssertEqual(cameraService.capturePhotoCallCount, 1)
        let calls = await scanService.identifyCalls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.mimeType, "image/jpeg")
    }

    func testCameraCaptureFailureSurfacesErrorAndNeverUploads() async {
        let (viewModel, scanService, cameraService, _) = await makeViewModel()
        cameraService.capturePhotoResult = .failure(CameraError.captureFailed)

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()
        viewModel.capture()
        await viewModel.waitForCurrentWork()

        guard case .error(let message) = viewModel.state else {
            return XCTFail("expected .error, got \(viewModel.state)")
        }
        XCTAssertFalse(message.isEmpty)
        let calls = await scanService.identifyCalls
        XCTAssertTrue(calls.isEmpty, "must never call identify if capture itself failed")
    }

    func testUploadFailureSurfacesUserFacingErrorMessage() async {
        let (viewModel, scanService, cameraService, _) = await makeViewModel()
        cameraService.capturePhotoResult = .success(fixtureJPEGData())
        await scanService.stubIdentify(.failure(FixtureError(message: "network down")))

        viewModel.onAppear()
        await viewModel.waitForCurrentWork()
        viewModel.capture()
        await viewModel.waitForCurrentWork()

        guard case .error(let message) = viewModel.state else {
            return XCTFail("expected .error, got \(viewModel.state)")
        }
        XCTAssertFalse(message.isEmpty)
    }

    func testRetryFromErrorStateReRunsTheFullQuotaAndPermissionFlow() async {
        let (viewModel, scanService, cameraService, _) = await makeViewModel(quota: .failure(FixtureError(message: "boom")))
        viewModel.onAppear()
        await viewModel.waitForCurrentWork()
        guard case .error = viewModel.state else { return XCTFail("expected initial .error") }

        await scanService.stubQuota(.success(ScanQuotaStatus(isPro: false, canScan: true, scansUsedThisWeek: 0, scanLimitPerWeek: 25)))
        viewModel.retry()
        await viewModel.waitForCurrentWork()

        guard case .ready = viewModel.state else {
            return XCTFail("expected .ready after retry, got \(viewModel.state)")
        }
        XCTAssertEqual(cameraService.startCallCount, 1)
    }
}

/// A minimal valid-enough JPEG byte sequence for tests that only need
/// `UIImage(data:)` to succeed (ScanImagePreparation) — produced via
/// UIGraphicsImageRenderer rather than hand-rolled bytes, so it decodes
/// exactly like a real captured photo would.
func fixtureJPEGData() -> Data {
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 40, height: 40))
    let image = renderer.image { ctx in
        UIColor.red.setFill()
        ctx.fill(CGRect(x: 0, y: 0, width: 40, height: 40))
    }
    return image.jpegData(compressionQuality: 0.9) ?? Data()
}
