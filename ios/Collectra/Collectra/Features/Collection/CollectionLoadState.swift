import Foundation

/// Shared load-state shape for every collection read screen (Shelf/Vault/
/// Wishlist) — one type instead of three structurally-identical nested
/// enums, so `CollectionStateView` (DesignSystem) can scaffold all three
/// without duplicating the loading/empty/error switch per screen.
enum CollectionLoadState: Equatable {
    case idle
    case loading
    case loaded
    case empty
    case error(String)
}
