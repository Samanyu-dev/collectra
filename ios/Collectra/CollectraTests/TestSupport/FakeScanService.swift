import Foundation
@testable import Collectra

/// Fake `ScanServicing` for ScanViewModel tests — an `actor` so it's
/// trivially `Sendable`, mirroring `FakeCollectionService`'s pattern.
actor FakeScanService: ScanServicing {
    private(set) var quotaCallCount = 0
    private(set) var identifyCalls: [(imageData: Data, mimeType: String)] = []

    private var quotaResult: Result<ScanQuotaStatus, Error> = .success(ScanQuotaStatus(isPro: false, canScan: true, scansUsedThisWeek: 0, scanLimitPerWeek: 25))
    private var identifyResult: Result<ScanIdentifyResponse, Error>?

    func stubQuota(_ result: Result<ScanQuotaStatus, Error>) { quotaResult = result }
    func stubIdentify(_ result: Result<ScanIdentifyResponse, Error>) { identifyResult = result }

    func quotaStatus() async throws -> ScanQuotaStatus {
        quotaCallCount += 1
        return try quotaResult.get()
    }

    func identify(imageData: Data, mimeType: String) async throws -> ScanIdentifyResponse {
        identifyCalls.append((imageData, mimeType))
        guard let identifyResult else {
            fatalError("FakeScanService.identify called without stubbing a result")
        }
        return try identifyResult.get()
    }
}
