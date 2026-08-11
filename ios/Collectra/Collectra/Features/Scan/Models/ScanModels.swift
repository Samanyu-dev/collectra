import Foundation

/// Mirrors `GET /api/v1/scan/quota`'s `data` shape
/// (src/app/api/v1/scan/quota/route.ts / getScanQuotaStatus). Read-only —
/// this is a pre-flight display value, never the authorization decision
/// itself; the server re-checks for real at confirm time (Phase 6B's
/// assertCanScan), which this app doesn't call yet in this phase.
struct ScanQuotaStatus: Decodable, Equatable {
    let isPro: Bool
    let canScan: Bool
    let scansUsedThisWeek: Int
    let scanLimitPerWeek: Int
}

/// Mirrors `POST /api/v1/scan/identify`'s request body
/// (src/app/api/v1/scan/identify/route.ts) — base64-in-JSON, matching what
/// the existing APIClient already speaks (see the Phase 6B API-design
/// decision doc'd on the backend route).
struct ScanIdentifyRequest: Encodable {
    let imageBase64: String
    let mimeType: String
    let fileName: String?
}

/// Mirrors `EnrichedCandidate` (src/lib/actions/scanner.ts). Not rendered
/// into candidate-card UI yet in this phase — Phase 6G's job — but the shape
/// is decoded now so the identify response round-trips safely end to end.
struct ScanCandidate: Decodable, Equatable, Identifiable {
    let variantId: String
    let confidence: Double
    let cardName: String
    let cardNumber: String
    let setName: String
    let imageUrl: String?

    var id: String { variantId }
}

/// Mirrors `IdentifyScanResponse` (src/lib/actions/scanner.ts) merged with
/// the `mediaId`/`previewUrl` the /api/v1/scan/identify route always adds.
/// The backend type is a discriminated union keyed on `ocrConfigured`
/// (`{ocrConfigured:false}` has none of the other fields at all) — modeled
/// here as one flat struct with every ocrConfigured-true-only field Optional,
/// which `Decodable`'s synthesized init already treats as "absent is fine"
/// via `decodeIfPresent`, so no custom decoder is needed.
struct ScanIdentifyResponse: Decodable, Equatable {
    let ocrConfigured: Bool
    let confidenceLabel: String?
    let confidence: Double?
    let reasons: [String]?
    let extractedName: String?
    let extractedCardNumber: String?
    let resolved: ScanCandidate?
    let candidates: [ScanCandidate]?
    let mediaId: String
    let previewUrl: String
}
