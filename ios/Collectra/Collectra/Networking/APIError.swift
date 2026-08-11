import Foundation

/// Mirrors the stable error codes `/api/v1` returns (src/lib/api/response.ts
/// on the backend) — never inspect `message` for control flow, only `code`;
/// `message` is for display, `code` is for behavior.
enum APIErrorCode: String, Decodable {
    case unauthenticated = "UNAUTHENTICATED"
    case invalidToken = "INVALID_TOKEN"
    case notFound = "NOT_FOUND"
    case validationError = "VALIDATION_ERROR"
    case forbidden = "FORBIDDEN"
    case paywall = "PAYWALL"
    case internalError = "INTERNAL_ERROR"
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = APIErrorCode(rawValue: raw) ?? .unknown
    }
}

/// The `message` on a PAYWALL error is one of entitlements.ts's plain-Error
/// codes (see src/lib/billing/paywall-messages.ts on the backend for the
/// same distinction, web-side) — which one determines the upgrade copy.
enum PaywallReason {
    case setLimit
    case scanLimit
    case other

    init(rawMessage: String) {
        switch rawMessage {
        case "PAYWALL_SET_LIMIT": self = .setLimit
        case "PAYWALL_SCAN_LIMIT": self = .scanLimit
        default: self = .other
        }
    }
}

struct APIErrorBody: Decodable {
    struct Inner: Decodable {
        let code: APIErrorCode
        let message: String
    }
    let error: Inner
}

/// Every failure the API client can surface, already user-presentable —
/// callers should show `.userMessage`, never a raw server string. Keeps
/// "translate server codes into meaningful messages" (Phase 3 requirement)
/// in exactly one place instead of scattered across every view.
enum APIError: Error, LocalizedError {
    case unauthenticated
    case invalidSession
    case notFound
    case validation(String)
    case forbidden
    case paywall(PaywallReason)
    case server
    case network(Error)
    case decoding(Error)
    case unknown

    static func from(status: Int, body: APIErrorBody?) -> APIError {
        switch body?.error.code {
        case .unauthenticated: return .unauthenticated
        case .invalidToken: return .invalidSession
        case .notFound: return .notFound
        case .validationError: return .validation(body?.error.message ?? "That request wasn't valid.")
        case .forbidden: return .forbidden
        case .paywall: return .paywall(PaywallReason(rawMessage: body?.error.message ?? ""))
        case .internalError, .unknown, nil:
            return status >= 500 ? .server : .unknown
        }
    }

    /// True for any PAYWALL response — callers use this to branch to an
    /// upgrade prompt instead of a generic error banner. Never infer this
    /// from `userMessage`'s text; check the case.
    var isPaywall: Bool {
        if case .paywall = self { return true }
        return false
    }

    var errorDescription: String? { userMessage }

    /// Safe to show directly in UI — never a raw server/internal string.
    var userMessage: String {
        switch self {
        case .unauthenticated, .invalidSession:
            return "Your session has expired. Please sign in again."
        case .notFound:
            return "We couldn't find that."
        case .validation(let message):
            return message
        case .forbidden:
            return "You don't have access to that."
        case .paywall(let reason):
            switch reason {
            case .setLimit:
                return "Free accounts can track cards from up to 4 different sets. Upgrade to Pro for unlimited sets."
            case .scanLimit:
                return "You've used all 25 free scans for this week. Upgrade to Pro for unlimited scanning."
            case .other:
                return "Upgrade to Pro to continue."
            }
        case .server:
            return "Something went wrong on our end. Please try again."
        case .network:
            return "Can't reach Collectra. Check your connection and try again."
        case .decoding:
            return "Something went wrong reading the response. Please try again."
        case .unknown:
            return "Something went wrong. Please try again."
        }
    }
}
