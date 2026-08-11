import Foundation

/// Abstraction over the Phase 6B scan network calls — mirrors
/// `CollectionServicing`'s pattern (View → ViewModel → Service →
/// APIClient → `/api/v1`; no feature gets a second networking layer, no
/// entitlement logic duplicated client-side). Lets `ScanViewModel` be
/// unit-tested against a fake without hitting the network or the camera.
protocol ScanServicing: Sendable {
    func quotaStatus() async throws -> ScanQuotaStatus
    func identify(imageData: Data, mimeType: String) async throws -> ScanIdentifyResponse
}

/// Talks to the real `/api/v1/scan/*` endpoints. The only place that knows
/// these routes/request shapes.
struct ScanService: ScanServicing {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func quotaStatus() async throws -> ScanQuotaStatus {
        try await client.get("/api/v1/scan/quota")
    }

    func identify(imageData: Data, mimeType: String) async throws -> ScanIdentifyResponse {
        let request = ScanIdentifyRequest(imageBase64: imageData.base64EncodedString(), mimeType: mimeType, fileName: "scan.jpg")
        return try await client.post("/api/v1/scan/identify", body: request)
    }
}
