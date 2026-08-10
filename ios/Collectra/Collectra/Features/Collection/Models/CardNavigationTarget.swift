import Foundation

/// Minimal, `Hashable` navigation payload shared by every collection screen
/// (Shelf/Vault/Wishlist) that pushes into Card Detail — avoids requiring
/// full `Hashable` conformance on the response models themselves (which
/// nest non-Hashable types like `PriceDisplay`) just for navigation.
struct CardNavigationTarget: Hashable {
    let cardId: String
    let cardName: String
}
