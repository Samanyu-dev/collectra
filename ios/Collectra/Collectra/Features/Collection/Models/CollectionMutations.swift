import Foundation

/// Mirrors `POST /api/v1/cards/[id]/variants/[variantId]/quantity`'s
/// `{ action: "increment" | "decrement" }` request body.
enum QuantityAction: String, Encodable {
    case increment
    case decrement
}

struct QuantityRequest: Encodable {
    let action: QuantityAction
}

/// Mirrors the quantity endpoint's `{ quantity: number }` response — the
/// authoritative post-mutation count. Never derived client-side:
/// `decrementVariantQuantityForUser` (src/lib/actions/collection.ts) can
/// silently no-op at 0, and picks whichever removable instance it prefers
/// (favoring to keep favorited/vaulted copies) rather than a
/// client-specified one — the server's returned count is the only source of
/// truth (Phase 5 requirement §6).
struct QuantityResponse: Decodable {
    let quantity: Int
}

/// Mirrors `POST /api/v1/instances/[instanceId]/favorite`'s response.
struct FavoriteResponse: Decodable {
    let instanceId: String
    let favorited: Bool
}

/// Mirrors `POST /api/v1/instances/[instanceId]/vault`'s response.
struct VaultToggleResponse: Decodable {
    let instanceId: String
    let vaulted: Bool
}

/// Mirrors `POST /api/v1/cards/[id]/wishlist`'s response.
struct WishlistToggleResponse: Decodable {
    let wishlisted: Bool
}
