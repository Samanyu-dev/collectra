import SwiftUI

/// Pushed from the Catalog tab's Sets grid (or Home's activity feed) —
/// header metadata from `SetDetailViewModel` + this set's card grid via a
/// `CatalogViewModel` scoped to `setId`, reusing `CardsGridContent` rather
/// than a second card-grid implementation. Does NOT own a `NavigationStack`
/// — it's a child of whichever stack pushed it, so `CardSummary` taps still
/// resolve through that ancestor's `.navigationDestination(for: CardSummary.
/// self)` (SwiftUI resolves the destination from any ancestor in the same
/// stack, not only the stack's immediate root).
struct SetDetailView: View {
    let setId: String
    let setName: String

    @StateObject private var detailViewModel: SetDetailViewModel
    @StateObject private var cardsViewModel: CatalogViewModel

    init(setId: String, setName: String) {
        self.setId = setId
        self.setName = setName
        _detailViewModel = StateObject(wrappedValue: SetDetailViewModel(setId: setId))
        _cardsViewModel = StateObject(wrappedValue: CatalogViewModel(setId: setId))
    }

    var body: some View {
        ZStack {
            Theme.Color_.background.ignoresSafeArea()
            VStack(spacing: 0) {
                header
                CardsGridContent(viewModel: cardsViewModel)
            }
        }
        .navigationTitle(setName)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { detailViewModel.onAppear() }
    }

    @ViewBuilder
    private var header: some View {
        switch detailViewModel.state {
        case .loading:
            ProgressView()
                .tint(Theme.Color_.textSecondary)
                .padding(Theme.Spacing.md)
        case .error:
            EmptyView() // the card grid below still loads independently; not worth a second error banner
        case .loaded(let detail):
            VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                Text("\(detail.franchiseName) · \(detail.seriesName)")
                    .font(Theme.Typography.body(12))
                    .foregroundStyle(Theme.Color_.textSecondary)

                HStack(spacing: Theme.Spacing.md) {
                    if detail.ownedCount > 0 {
                        Text("\(detail.ownedCount)/\(detail.printedTotal) owned")
                            .font(Theme.Typography.mono(13, weight: .semibold))
                            .foregroundStyle(Theme.Color_.rarityUncommon)
                        Text("$\(detail.totalValueUsd, specifier: "%.2f")")
                            .font(Theme.Typography.mono(13))
                            .foregroundStyle(Theme.Color_.textSecondary)
                    } else {
                        Text("\(detail.printedTotal) cards")
                            .font(Theme.Typography.mono(13))
                            .foregroundStyle(Theme.Color_.textSecondary)
                    }
                }

                if detail.ownedCount > 0 {
                    ProgressView(value: detail.percentOwned)
                        .tint(Theme.Color_.rarityUncommon)
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.vertical, Theme.Spacing.sm)
        }
    }
}
