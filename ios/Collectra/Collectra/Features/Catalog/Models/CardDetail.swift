import Foundation

/// Mirrors one entry of `CardDetail.variants` (src/app/api/v1/cards/[id]/route.ts)
/// — a specific purchasable/collectible printing of a card (base, parallel,
/// insert, etc). A card is not assumed to have any particular set of
/// variants; always driven by what the API returns.
struct CardVariant: Decodable, Equatable, Identifiable {
    struct NamedRef: Decodable, Equatable {
        let id: String
        let name: String
    }

    let id: String
    let printing: NamedRef?
    let parallel: NamedRef?
    let insert: NamedRef?
    let isFoil: Bool
    let isAuto: Bool
    let isPatch: Bool
    let isRelic: Bool
    let serialTo: Int?
    let price: PriceDisplay
    let priceHistory: PriceHistoryResult?
    let gradedPriceHistory: GradedPriceHistoryResult?
    let ownedQuantity: Int
    /// A representative owned Instance id for this variant, or `nil` when
    /// unowned (`ownedQuantity == 0`). The ONLY id Card Detail may pass to
    /// `POST /api/v1/instances/[instanceId]/{favorite,vault}` — never
    /// manufactured client-side (Phase 5 requirement §7/§8). Added to the
    /// API in Phase 5 specifically to make this possible; see
    /// getPrimaryOwnedInstanceIdsForUser's doc comment
    /// (src/lib/actions/collection.ts) for why any owned instance id for the
    /// variant works identically for these two endpoints.
    let instanceId: String?
    let vaulted: Bool
    let favorited: Bool

    /// Human label for a variant-picker chip — combines whichever of
    /// insert/parallel/printing names are present (prisma's `Insert` and
    /// `Parallel` are independent categories; a variant need not have
    /// either), falling back to "Base" when none apply.
    var displayName: String {
        let parts = [insert?.name, parallel?.name, printing?.name].compactMap { $0 }
        var label = parts.isEmpty ? "Base" : parts.joined(separator: " · ")

        var tags: [String] = []
        if isAuto { tags.append("Auto") }
        if isRelic { tags.append("Relic") }
        if isPatch { tags.append("Patch") }
        if isFoil { tags.append("Foil") }
        if let serialTo { tags.append("/\(serialTo)") }
        if !tags.isEmpty { label += " (\(tags.joined(separator: ", ")))" }

        return label
    }
}

/// Mirrors `GET /api/v1/cards/[id]`'s `data` shape. Auth is optional on this
/// endpoint (src/app/api/v1/cards/[id]/route.ts doc comment) — `viewer` is
/// only present when the caller supplied a valid Bearer token.
struct CardDetail: Decodable, Equatable {
    struct SetInfo: Decodable, Equatable {
        let id: String
        let name: String
        let franchiseName: String
    }

    struct Viewer: Decodable, Equatable {
        let isWishlisted: Bool
    }

    let id: String
    let name: String
    let number: String
    let supertype: String?
    let subtypes: String?
    let hp: String?
    let rules: String?
    let flavorText: String?
    let set: SetInfo
    let images: [MediaImage]
    let variants: [CardVariant]
    let viewer: Viewer?

    /// The detail hero — prefers OFFICIAL_ARTWORK, the best quality
    /// available, matching the web app's `pickPrimaryImage` priority.
    var primaryImageURL: URL? {
        images.primaryImageURL()
    }

    /// Returns a copy with one variant replaced by id — the mechanism
    /// `CardDetailViewModel` uses to apply a mutation's (optimistic or
    /// server-confirmed) result to exactly the variant that was actually
    /// mutated, never whichever variant happens to be selected by the time
    /// the response arrives (Phase 5 requirement §18).
    func replacingVariant(_ updated: CardVariant) -> CardDetail {
        var newVariants = variants
        guard let index = newVariants.firstIndex(where: { $0.id == updated.id }) else { return self }
        newVariants[index] = updated
        return CardDetail(
            id: id, name: name, number: number, supertype: supertype, subtypes: subtypes,
            hp: hp, rules: rules, flavorText: flavorText, set: set, images: images,
            variants: newVariants, viewer: viewer
        )
    }

    /// Returns a copy with `viewer.isWishlisted` replaced — wishlist state
    /// is card-level, not per-variant (Phase 5 requirement §9).
    func replacingWishlisted(_ isWishlisted: Bool) -> CardDetail {
        CardDetail(
            id: id, name: name, number: number, supertype: supertype, subtypes: subtypes,
            hp: hp, rules: rules, flavorText: flavorText, set: set, images: images,
            variants: variants, viewer: Viewer(isWishlisted: isWishlisted)
        )
    }
}

extension CardVariant {
    /// Returns a copy with only favorite/vault/quantity/instanceId
    /// overridden — used to apply a mutation result without hand-writing
    /// every field at each call site. Quantity mutations don't use this:
    /// the quantity endpoint doesn't return an `instanceId`, so
    /// `CardDetailViewModel` re-fetches the whole card after a quantity
    /// change instead of patching (see its doc comment).
    func updatingCollectionState(favorited: Bool? = nil, vaulted: Bool? = nil) -> CardVariant {
        CardVariant(
            id: id, printing: printing, parallel: parallel, insert: insert,
            isFoil: isFoil, isAuto: isAuto, isPatch: isPatch, isRelic: isRelic, serialTo: serialTo,
            price: price, priceHistory: priceHistory, gradedPriceHistory: gradedPriceHistory,
            ownedQuantity: ownedQuantity, instanceId: instanceId,
            vaulted: vaulted ?? self.vaulted,
            favorited: favorited ?? self.favorited
        )
    }
}
