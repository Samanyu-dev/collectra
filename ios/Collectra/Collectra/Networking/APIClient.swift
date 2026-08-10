import Foundation
import os

private struct Envelope<Wrapped: Decodable>: Decodable { let data: Wrapped }

// TEMP DIAGNOSTIC (Phase 5 card-detail triage) — remove once root cause is fixed.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "APIClient")

/// The ONLY thing in this app that talks to the network. Every feature
/// service (future Catalog/Shelf/etc.) sits on top of this — none of them
/// should touch URLSession directly. Understands the Phase 2 envelope
/// (`{data}` / `{error:{code,message}}`) and attaches the caller's Supabase
/// access token as `Authorization: Bearer <token>` — this app never talks to
/// Postgres/Prisma directly and never sees a service-role key.
actor APIClient {
    static let shared = APIClient(session: .shared, tokenProvider: { await SessionManager.shared.accessToken })

    private let session: URLSession
    /// Async so it can go through Supabase's own session refresh rather than
    /// caching a token here that could silently go stale.
    private let tokenProvider: () async -> String?

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    init(session: URLSession, tokenProvider: @escaping () async -> String?) {
        self.session = session
        self.tokenProvider = tokenProvider
    }

    enum Method: String {
        case get = "GET"
        case post = "POST"
    }

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        try await request(.get, path, query: query, body: Optional<Never>.none)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        try await request(.post, path, query: [:], body: Optional<Never>.none)
    }

    func post<Body: Encodable, T: Decodable>(_ path: String, body: Body) async throws -> T {
        try await request(.post, path, query: [:], body: body)
    }

    private func request<Body: Encodable, T: Decodable>(
        _ method: Method,
        _ path: String,
        query: [String: String],
        body: Body?
    ) async throws -> T {
        var components = URLComponents(url: AppConfig.apiBaseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
        if !query.isEmpty {
            components?.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components?.url else { throw APIError.unknown }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = await tokenProvider() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
            urlRequest.httpBody = try encoder.encode(body)
        }

        // TEMP DIAGNOSTIC (Phase 5 card-detail triage) — remove once root cause is fixed.
        let diagStart = DispatchTime.now()
        diagLog.debug("request.start method=\(method.rawValue, privacy: .public) path=\(path, privacy: .public) hasToken=\(urlRequest.value(forHTTPHeaderField: "Authorization") != nil, privacy: .public)")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            let elapsedMs = (DispatchTime.now().uptimeNanoseconds - diagStart.uptimeNanoseconds) / 1_000_000
            diagLog.error("request.transportError path=\(path, privacy: .public) elapsedMs=\(elapsedMs, privacy: .public) error=\(String(describing: error), privacy: .public)")
            throw APIError.network(error)
        }

        let elapsedMs = (DispatchTime.now().uptimeNanoseconds - diagStart.uptimeNanoseconds) / 1_000_000
        guard let httpResponse = response as? HTTPURLResponse else {
            diagLog.error("request.noHTTPResponse path=\(path, privacy: .public) elapsedMs=\(elapsedMs, privacy: .public)")
            throw APIError.unknown
        }
        diagLog.debug("request.received path=\(path, privacy: .public) status=\(httpResponse.statusCode, privacy: .public) elapsedMs=\(elapsedMs, privacy: .public) bytes=\(data.count, privacy: .public)")

        guard (200..<300).contains(httpResponse.statusCode) else {
            let errorBody = try? decoder.decode(APIErrorBody.self, from: data)
            diagLog.error("request.httpError path=\(path, privacy: .public) status=\(httpResponse.statusCode, privacy: .public) code=\(String(describing: errorBody?.error.code), privacy: .public)")
            throw APIError.from(status: httpResponse.statusCode, body: errorBody)
        }

        do {
            let decoded = try decoder.decode(Envelope<T>.self, from: data).data
            diagLog.debug("request.decoded path=\(path, privacy: .public) elapsedMs=\(elapsedMs, privacy: .public)")
            return decoded
        } catch let error as APIError {
            diagLog.error("request.decodeAPIError path=\(path, privacy: .public) error=\(String(describing: error), privacy: .public)")
            throw error
        } catch {
            diagLog.error("request.decodeError path=\(path, privacy: .public) error=\(String(describing: error), privacy: .public)")
            throw APIError.decoding(error)
        }
    }
}
