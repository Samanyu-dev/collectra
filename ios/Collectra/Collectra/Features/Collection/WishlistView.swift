import SwiftUI

/// The user's wishlisted cards — real data from `GET /api/v1/wishlist`
/// (Phase 5 requirement §5). Embedded inside `ShelfView`'s segmented
/// switcher and shared `NavigationStack`.
struct WishlistView: View {
    @ObservedObject var viewModel: WishlistViewModel
    let onBrowseCatalog: () -> Void

    var body: some View {
        CollectionStateView(
            state: viewModel.loadState,
            loadingMessage: "Loading your wishlist…",
            emptyIcon: "star",
            emptyTitle: "Your Wishlist is empty",
            emptyMessage: "Cards you wishlist from Card Detail will appear here.",
            emptyActionTitle: "Browse Catalog",
            onEmptyAction: onBrowseCatalog,
            onRetry: { viewModel.retry() }
        ) {
            ScrollView {
                LazyVGrid(columns: CollectionGridLayout.columns, spacing: Theme.Spacing.lg) {
                    ForEach(viewModel.items) { item in
                        NavigationLink(value: CardNavigationTarget(cardId: item.cardId, cardName: item.name)) {
                            WishlistCell(item: item)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("wishlist-card-cell")
                    }
                }
                .padding(Theme.Spacing.md)
            }
            .refreshable { await viewModel.refresh() }
        }
        .onAppear { viewModel.onAppear() }
    }
}
