import Foundation
import Supabase

/// The single source of truth for "is anyone signed in, and as whom" — views
/// observe `state` and never inspect a token themselves (Phase 3
/// requirement). `APIClient` reads `accessToken` for every request instead
/// of any view/service caching a token of its own.
///
/// Flow this implements end-to-end:
///   iOS → Supabase Auth → Supabase access token →
///   `Authorization: Bearer <token>` → Collectra `/api/v1`
@MainActor
final class SessionManager: ObservableObject {
    static let shared = SessionManager()

    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(userId: String, email: String)
    }

    @Published private(set) var state: State = .loading

    private let client: SupabaseClient
    private var authStateTask: Task<Void, Never>?

    init(client: SupabaseClient = SupabaseClientProvider.client) {
        self.client = client
    }

    /// Call once at app launch. `auth.authStateChanges` emits an initial
    /// event immediately reflecting whatever session the SDK already
    /// restored from Keychain — that IS session restoration; there's no
    /// separate "restore" step to write, only listening for it.
    func start() {
        authStateTask?.cancel()
        authStateTask = Task {
            for await (event, session) in client.auth.authStateChanges {
                guard !Task.isCancelled else { return }
                switch event {
                case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                    if let session {
                        state = .signedIn(userId: session.user.id.uuidString, email: session.user.email ?? "")
                    } else {
                        state = .signedOut
                    }
                case .signedOut, .userDeleted:
                    state = .signedOut
                case .passwordRecovery, .mfaChallengeVerified:
                    break
                }
            }
        }
    }

    /// The token every APIClient request attaches as `Authorization: Bearer
    /// <token>`. Goes through the SDK's `session` accessor rather than
    /// caching a token locally, so an expired token gets the SDK's own
    /// refresh-and-retry instead of silently going stale.
    var accessToken: String? {
        get async {
            try? await client.auth.session.accessToken
        }
    }

    func signIn(email: String, password: String) async throws {
        do {
            try await client.auth.signIn(email: email, password: password)
        } catch {
            throw AuthOperationError.from(error)
        }
    }

    /// Supabase's default project settings require email confirmation
    /// before `signUp` returns an active session — in that case the user
    /// lands back on Sign In after confirming, which is standard and
    /// expected, not a bug in this flow.
    func signUp(email: String, password: String) async throws {
        do {
            try await client.auth.signUp(email: email, password: password)
        } catch {
            throw AuthOperationError.from(error)
        }
    }

    func signOut() async throws {
        do {
            try await client.auth.signOut()
        } catch {
            throw AuthOperationError.from(error)
        }
    }
}

/// Translates Supabase SDK errors into messages safe to show a user —
/// mirrors APIError's role for the API client side of the app.
enum AuthOperationError: Error, LocalizedError {
    case invalidCredentials
    case network
    case unknown(String)

    static func from(_ error: Error) -> AuthOperationError {
        let message = error.localizedDescription.lowercased()
        if message.contains("invalid login credentials") || message.contains("invalid_credentials") {
            return .invalidCredentials
        }
        if message.contains("offline") || message.contains("connection") || message.contains("network") {
            return .network
        }
        return .unknown(error.localizedDescription)
    }

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Incorrect email or password."
        case .network:
            return "Can't reach Collectra. Check your connection and try again."
        case .unknown:
            return "Something went wrong. Please try again."
        }
    }
}
