import Foundation

/// Abstraction over "fetch the dashboard" — lets `HomeViewModel` be
/// unit-tested against a fake, same reasoning as every other feature service.
protocol HomeServicing: Sendable {
    func fetchDashboard() async throws -> DashboardSummary
}

/// Talks to `GET /api/v1/dashboard` (src/app/api/v1/dashboard/route.ts).
struct HomeService: HomeServicing {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchDashboard() async throws -> DashboardSummary {
        try await client.get("/api/v1/dashboard")
    }
}
