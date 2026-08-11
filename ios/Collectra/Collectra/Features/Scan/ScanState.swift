import Foundation

/// Every state Phase 6C's slice can be in — deliberately stops at
/// `.received`; candidate/confirmation UI is Phase 6G+'s job, not this one's
/// (see ScanViewModel's doc comment for the explicit scope boundary).
enum ScanState {
    case checkingQuota
    /// Server said the free-tier weekly scan quota is spent — camera never
    /// opens. Carries the status so the view can show real numbers, not a
    /// generic message.
    case quotaBlocked(ScanQuotaStatus)
    case checkingPermission
    case permissionDenied
    case permissionRestricted
    case cameraUnavailable(String)
    case ready
    case capturing
    case preparingImage
    case uploading
    /// Terminal state for this phase — the identify response was received
    /// and safely decoded. No candidate cards, no confirmation, no
    /// collection mutation here; that's the next slice.
    case received(ScanIdentifyResponse)
    case error(String)
    case cancelled
}
