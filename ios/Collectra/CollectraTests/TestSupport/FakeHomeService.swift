import Foundation
@testable import Collectra

/// Fake `HomeServicing` for `HomeViewModel` tests, mirroring
/// `FakeCollectionService`'s single-endpoint fake pattern.
actor FakeHomeService: HomeServicing {
    private(set) var fetchCount = 0
    private var result: Result<DashboardSummary, Error> = .success(.fixture())

    func stub(_ result: Result<DashboardSummary, Error>) {
        self.result = result
    }

    func fetchDashboard() async throws -> DashboardSummary {
        fetchCount += 1
        return try result.get()
    }
}

extension DashboardSummary {
    static func fixture(
        portfolioValueUsd: Double = 0,
        topOwnedValuable: [TopValuableCard] = [],
        recentActivity: [ActivityEntry] = [],
        wishlistCount: Int = 0
    ) -> DashboardSummary {
        DashboardSummary(
            portfolioValueUsd: portfolioValueUsd,
            changeToday: nil,
            topOwnedValuable: topOwnedValuable,
            recentActivity: recentActivity,
            wishlistCount: wishlistCount
        )
    }
}

extension DashboardSummary.TopValuableCard {
    static func fixture(variantId: String = "v1", cardName: String = "Card") -> DashboardSummary.TopValuableCard {
        DashboardSummary.TopValuableCard(
            variantId: variantId, cardId: "card-1", cardName: cardName, cardNumber: "1",
            setName: "Test Set", franchiseName: "Test Franchise", imageUrl: nil,
            marketPriceUsd: 10, cardType: "Base", rarityTier: "common", sparkline: nil
        )
    }
}
