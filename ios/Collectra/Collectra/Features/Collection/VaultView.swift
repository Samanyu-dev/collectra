import SwiftUI

/// The user's vaulted instances — real data from `GET /api/v1/vault`
/// (Phase 5 requirement §4), visually distinct from Shelf via `VaultCell`'s
/// amber/lock treatment. Embedded inside `ShelfView`'s segmented switcher
/// and shared `NavigationStack`.
struct VaultView: View {
    @ObservedObject var viewModel: VaultViewModel
    let onBrowseCatalog: () -> Void

    var body: some View {
        CollectionStateView(
            state: viewModel.loadState,
            loadingMessage: "Loading your vault…",
            emptyIcon: "lock",
            emptyTitle: "Your Vault is empty",
            emptyMessage: "Move a card here from Card Detail to keep it separate from the rest of your Shelf.",
            emptyActionTitle: "Browse Catalog",
            onEmptyAction: onBrowseCatalog,
            onRetry: { viewModel.retry() }
        ) {
            ScrollView {
                if viewModel.totalVaultValue > 0 {
                    HStack {
                        Text("VAULT VALUE")
                            .font(Theme.Typography.body(11, weight: .semibold))
                            .foregroundStyle(Theme.Color_.textTertiary)
                            .tracking(1)
                        Spacer()
                        Text(viewModel.totalVaultValue, format: .currency(code: "USD"))
                            .font(Theme.Typography.mono(15, weight: .semibold))
                            .foregroundStyle(Theme.Color_.raritySAR)
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                    .padding(.top, Theme.Spacing.sm)
                }

                LazyVGrid(columns: CollectionGridLayout.columns, spacing: Theme.Spacing.lg) {
                    ForEach(viewModel.items) { item in
                        NavigationLink(value: CardNavigationTarget(cardId: item.cardId, cardName: item.name)) {
                            VaultCell(item: item)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("vault-card-cell")
                    }
                }
                .padding(Theme.Spacing.md)
            }
            .refreshable { await viewModel.refresh() }
        }
        .onAppear { viewModel.onAppear() }
    }
}
