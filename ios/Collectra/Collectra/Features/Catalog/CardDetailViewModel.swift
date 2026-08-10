import Foundation
import os

// TEMP DIAGNOSTIC (Phase 5 card-detail triage) — remove once root cause is fixed.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "CardDetailViewModel")

/// Drives `CardDetailView`: loads `GET /api/v1/cards/[id]` and owns which
/// variant is currently selected (Phase 4), plus every Phase 5 mutation —
/// quantity, favorite, vault, wishlist — through `CollectionServicing`.
///
/// Every mutation captures its target variant/card id at the moment it's
/// invoked and always patches that specific id later, never "whichever
/// variant is selected when the response arrives" — the user may switch
/// variants while a mutation is in flight, and the response must land on
/// the variant it actually mutated (Phase 5 requirement §18).
@MainActor
final class CardDetailViewModel: ObservableObject {
    enum LoadState: Equatable {
        case loading
        case loaded
        case error(String)
    }

    @Published private(set) var loadState: LoadState = .loading
    @Published private(set) var detail: CardDetail?
    @Published private(set) var selectedVariantId: String?

    @Published private(set) var isMutatingQuantity = false
    @Published private(set) var isMutatingFavorite = false
    @Published private(set) var isMutatingVault = false
    @Published private(set) var isMutatingWishlist = false
    @Published private(set) var mutationErrorMessage: String?

    private let cardId: String
    private let service: CardDetailServicing
    private let collectionService: CollectionServicing
    private var loadTask: Task<Void, Never>?
    private var quantityTask: Task<Void, Never>?
    private var favoriteTask: Task<Void, Never>?
    private var vaultTask: Task<Void, Never>?
    private var wishlistTask: Task<Void, Never>?

    init(
        cardId: String,
        service: CardDetailServicing = CardDetailService(),
        collectionService: CollectionServicing = CollectionService()
    ) {
        self.cardId = cardId
        self.service = service
        self.collectionService = collectionService
    }

    var selectedVariant: CardVariant? {
        guard let detail else { return nil }
        if let selectedVariantId, let match = detail.variants.first(where: { $0.id == selectedVariantId }) {
            return match
        }
        return detail.variants.first
    }

    /// No-ops if a load is already in flight — guards against duplicate
    /// requests when `.onAppear` fires more than once (e.g. a fast back/forward
    /// navigation) for the same card.
    func load() {
        guard loadTask == nil else {
            diagLog.debug("load.skipped cardId=\(self.cardId, privacy: .public) reason=alreadyInFlight")
            return
        }
        diagLog.debug("load.start cardId=\(self.cardId, privacy: .public)")
        loadState = .loading
        loadTask = Task { [weak self] in
            guard let self else { return }
            do {
                let detail = try await self.service.fetchCardDetail(id: self.cardId)
                diagLog.debug("load.gotDetail cardId=\(self.cardId, privacy: .public) — about to publish loadState=.loaded")
                self.detail = detail
                self.selectedVariantId = detail.variants.first?.id
                self.loadState = .loaded
                diagLog.debug("load.published cardId=\(self.cardId, privacy: .public) loadState=.loaded selectedVariantId=\(self.selectedVariantId ?? "nil", privacy: .public)")
            } catch {
                diagLog.error("load.error cardId=\(self.cardId, privacy: .public) error=\(String(describing: error), privacy: .public)")
                self.loadState = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
            }
            self.loadTask = nil
        }
    }

    func retry() {
        loadTask = nil
        load()
    }

    func select(variant: CardVariant) {
        selectedVariantId = variant.id
    }

    // MARK: - Quantity

    /// No optimistic update here (Phase 5 requirement §10: "prefer
    /// server-confirmed state" for quantity) — shows a loading state on the
    /// stepper, then applies whatever the server actually returns.
    /// Re-fetches the whole card afterward rather than patching `ownedQuantity`
    /// in place: the quantity endpoint's response is just `{ quantity }`, with
    /// no `instanceId`, and a 0→1 transition needs a fresh one for the
    /// favorite/vault buttons to become available.
    func changeQuantity(_ action: QuantityAction) {
        guard !isMutatingQuantity, let variant = selectedVariant else { return }
        if action == .decrement && variant.ownedQuantity <= 0 { return }

        let targetVariantId = variant.id
        isMutatingQuantity = true
        mutationErrorMessage = nil
        quantityTask = Task { [weak self] in
            guard let self else { return }
            defer { self.isMutatingQuantity = false }
            do {
                _ = try await self.collectionService.setQuantity(cardId: self.cardId, variantId: targetVariantId, action: action)
                let refreshed = try await self.service.fetchCardDetail(id: self.cardId)
                self.detail = refreshed
                CollectionSyncCenter.shared.markChanged()
            } catch {
                self.mutationErrorMessage = (error as? APIError)?.userMessage ?? "Couldn't update quantity. Please try again."
            }
        }
    }

    // MARK: - Favorite / Vault (instance-level)

    func toggleFavorite() {
        guard !isMutatingFavorite, let variant = selectedVariant, let instanceId = variant.instanceId else { return }
        let targetVariantId = variant.id
        let optimistic = !variant.favorited
        applyVariant(targetVariantId) { $0.updatingCollectionState(favorited: optimistic) }

        isMutatingFavorite = true
        mutationErrorMessage = nil
        favoriteTask = Task { [weak self] in
            guard let self else { return }
            defer { self.isMutatingFavorite = false }
            do {
                let response = try await self.collectionService.toggleFavorite(instanceId: instanceId)
                self.applyVariant(targetVariantId) { $0.updatingCollectionState(favorited: response.favorited) }
                CollectionSyncCenter.shared.markChanged()
            } catch {
                self.applyVariant(targetVariantId) { $0.updatingCollectionState(favorited: !optimistic) }
                self.mutationErrorMessage = (error as? APIError)?.userMessage ?? "Couldn't update favorite. Please try again."
            }
        }
    }

    func toggleVault() {
        guard !isMutatingVault, let variant = selectedVariant, let instanceId = variant.instanceId else { return }
        let targetVariantId = variant.id
        let optimistic = !variant.vaulted
        applyVariant(targetVariantId) { $0.updatingCollectionState(vaulted: optimistic) }

        isMutatingVault = true
        mutationErrorMessage = nil
        vaultTask = Task { [weak self] in
            guard let self else { return }
            defer { self.isMutatingVault = false }
            do {
                let response = try await self.collectionService.toggleVault(instanceId: instanceId)
                self.applyVariant(targetVariantId) { $0.updatingCollectionState(vaulted: response.vaulted) }
                CollectionSyncCenter.shared.markChanged()
            } catch {
                self.applyVariant(targetVariantId) { $0.updatingCollectionState(vaulted: !optimistic) }
                self.mutationErrorMessage = (error as? APIError)?.userMessage ?? "Couldn't update vault. Please try again."
            }
        }
    }

    // MARK: - Wishlist (card-level)

    func toggleWishlist() {
        guard !isMutatingWishlist, let detail else { return }
        let targetCardId = detail.id
        let optimistic = !(detail.viewer?.isWishlisted ?? false)
        self.detail = detail.replacingWishlisted(optimistic)

        isMutatingWishlist = true
        mutationErrorMessage = nil
        wishlistTask = Task { [weak self] in
            guard let self else { return }
            defer { self.isMutatingWishlist = false }
            do {
                let wishlisted = try await self.collectionService.toggleWishlist(cardId: targetCardId)
                self.applyWishlisted(wishlisted, forCardId: targetCardId)
                CollectionSyncCenter.shared.markChanged()
            } catch {
                self.applyWishlisted(!optimistic, forCardId: targetCardId)
                self.mutationErrorMessage = (error as? APIError)?.userMessage ?? "Couldn't update wishlist. Please try again."
            }
        }
    }

    private func applyVariant(_ variantId: String, _ transform: (CardVariant) -> CardVariant) {
        guard let detail, let current = detail.variants.first(where: { $0.id == variantId }) else { return }
        self.detail = detail.replacingVariant(transform(current))
    }

    private func applyWishlisted(_ value: Bool, forCardId cardId: String) {
        guard let detail, detail.id == cardId else { return }
        self.detail = detail.replacingWishlisted(value)
    }

    /// Test-only: awaits the in-flight load, if any, so tests can observe
    /// its result deterministically instead of sleeping.
    func waitForLoad() async {
        await loadTask?.value
    }

    /// Test-only: awaits whichever mutation is in flight.
    func waitForQuantityMutation() async { await quantityTask?.value }
    func waitForFavoriteMutation() async { await favoriteTask?.value }
    func waitForVaultMutation() async { await vaultTask?.value }
    func waitForWishlistMutation() async { await wishlistTask?.value }
}
