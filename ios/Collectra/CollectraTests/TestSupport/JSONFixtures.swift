import Foundation
@testable import Collectra

/// Shared JSON-decoding helper for tests — mirrors `APIClient`'s own decoder
/// configuration (`.iso8601` dates) so decoding tests exercise the same
/// contract the real network layer uses, not a looser one.
enum JSONFixtures {
    static func decode<T: Decodable>(_ type: T.Type, from json: String) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: Data(json.utf8))
    }
}

extension CardSummary {
    /// Builds a minimal, no-price-data card for pagination/search view-model
    /// tests that only care about identity and ordering, not pricing.
    static func fixture(id: String, name: String? = nil, ownedQuantity: Int = 0) -> CardSummary {
        CardSummary(
            id: id,
            name: name ?? "Card \(id)",
            number: "1",
            setId: "set-1",
            setName: "Test Set",
            franchiseName: "Test Franchise",
            images: [],
            price: PriceDisplay(
                valueUsd: nil,
                confidenceLabel: .noData,
                observationCount: 0,
                lastUpdated: nil,
                sources: [],
                trend30dPercent: nil,
                lowUsd: nil,
                highUsd: nil,
                soldAverageUsd: nil
            ),
            ownedQuantity: ownedQuantity
        )
    }
}

struct FixtureError: Error, Equatable {
    let message: String
}

extension ShelfItem {
    static func fixture(variantId: String = "v1", cardId: String = "card-1", cardName: String = "Card", quantity: Int = 1) -> ShelfItem {
        ShelfItem(
            variantId: variantId, cardId: cardId, cardName: cardName, cardNumber: "1",
            setName: "Set", franchiseName: "Franchise", printingName: nil, parallelName: nil,
            isFoil: false, images: [], variantImages: [], scanMediaUrl: nil, quantity: quantity,
            primaryInstanceId: "instance-1", createdAt: Date(timeIntervalSince1970: 0), condition: "NM",
            isGraded: false, isFavorite: false,
            price: PriceDisplay(
                valueUsd: 1.0, confidenceLabel: .high, observationCount: 1, lastUpdated: nil,
                sources: [], trend30dPercent: nil, lowUsd: nil, highUsd: nil, soldAverageUsd: nil
            ),
            purchasePrice: nil, acquisitionSource: "MANUAL", activeListingId: nil, isWishlisted: false
        )
    }
}

extension VaultItem {
    static func fixture(instanceId: String = "instance-1", cardId: String = "card-1", name: String = "Card") -> VaultItem {
        VaultItem(
            instanceId: instanceId, cardId: cardId, variantId: "v1", name: name,
            franchiseName: "Franchise", setName: "Set", images: [], estimatedValue: 10.0,
            purchaseDate: nil, notes: nil, isFavorite: false, certification: nil
        )
    }
}

extension WishlistItem {
    static func fixture(id: String = "wish-1", cardId: String = "card-1", name: String = "Card") -> WishlistItem {
        WishlistItem(
            id: id, cardId: cardId, name: name, number: "1", setName: "Set", priceAlert: nil,
            addedAt: Date(timeIntervalSince1970: 0), images: [],
            price: PriceDisplay(
                valueUsd: 1.0, confidenceLabel: .high, observationCount: 1, lastUpdated: nil,
                sources: [], trend30dPercent: nil, lowUsd: nil, highUsd: nil, soldAverageUsd: nil
            ),
            alertTriggered: false
        )
    }
}
