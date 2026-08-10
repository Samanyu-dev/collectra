import SwiftUI

/// The user's owned cards — real data from `GET /api/v1/shelf/collection`
/// (Phase 5 requirement §3). Embedded inside `ShelfView`'s segmented
/// switcher and shared `NavigationStack`.
struct ShelfContentView: View {
    @ObservedObject var viewModel: ShelfViewModel
    let onBrowseCatalog: () -> Void

    var body: some View {
        CollectionStateView(
            state: viewModel.loadState,
            loadingMessage: "Loading your collection…",
            emptyIcon: "square.stack",
            emptyTitle: "Your Shelf is empty",
            emptyMessage: "Cards you add to your collection will appear here.",
            emptyActionTitle: "Browse Catalog",
            onEmptyAction: onBrowseCatalog,
            onRetry: { viewModel.retry() }
        ) {
            ScrollView {
                LazyVGrid(columns: CollectionGridLayout.columns, spacing: Theme.Spacing.lg) {
                    ForEach(viewModel.items) { item in
                        NavigationLink(value: CardNavigationTarget(cardId: item.cardId, cardName: item.cardName)) {
                            ShelfCell(item: item)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("shelf-card-cell")
                    }
                }
                .padding(Theme.Spacing.md)
            }
            .refreshable { await viewModel.refresh() }
        }
        .onAppear { viewModel.onAppear() }
    }
}
