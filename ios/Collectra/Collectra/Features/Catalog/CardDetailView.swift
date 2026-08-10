import SwiftUI
import os

// TEMP DIAGNOSTIC (Phase 5 card-detail triage) — remove once root cause is fixed.
private let diagLog = Logger(subsystem: "com.collectra.diagnostic", category: "CardDetailView")

/// Card detail — renders `GET /api/v1/cards/[id]`'s full payload: identity,
/// media, a variant picker, pricing, price history (Phase 4), plus quantity/
/// favorite/vault/wishlist mutations (Phase 5) via `CollectionControlsView`.
struct CardDetailView: View {
    let cardId: String
    let cardName: String

    @StateObject private var viewModel: CardDetailViewModel

    init(cardId: String, cardName: String) {
        self.cardId = cardId
        self.cardName = cardName
        _viewModel = StateObject(wrappedValue: CardDetailViewModel(cardId: cardId))
    }

    var body: some View {
        ZStack {
            Theme.Color_.background.ignoresSafeArea()
            content
        }
        .navigationTitle(cardName)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            diagLog.debug("onAppear cardId=\(cardId, privacy: .public)")
            viewModel.load()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            loadingView
        case .error(let message):
            let _ = diagLog.error("content.renderError cardId=\(cardId, privacy: .public) message=\(message, privacy: .public)")
            errorView(message: message)
        case .loaded:
            if let detail = viewModel.detail {
                let _ = diagLog.debug("content.renderLoaded cardId=\(cardId, privacy: .public) selectedVariant=\(viewModel.selectedVariant?.id ?? "nil", privacy: .public)")
                detailView(detail)
            } else {
                let _ = diagLog.error("content.loadedButNoDetail cardId=\(cardId, privacy: .public)")
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: Theme.Spacing.md) {
            ProgressView().tint(Theme.Color_.textSecondary)
            Text("Loading card…")
                .font(Theme.Typography.body(13))
                .foregroundStyle(Theme.Color_.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(Theme.Color_.destructive)
            Text(message)
                .font(Theme.Typography.body(14))
                .foregroundStyle(Theme.Color_.textSecondary)
                .multilineTextAlignment(.center)
            Button("Try Again") { viewModel.retry() }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 200)
        }
        .padding(Theme.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func detailView(_ detail: CardDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                heroImage(detail)
                identitySection(detail)

                if !detail.variants.isEmpty {
                    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                        Text("VARIANTS")
                            .font(Theme.Typography.body(11, weight: .semibold))
                            .foregroundStyle(Theme.Color_.textTertiary)
                            .tracking(1)
                            .padding(.horizontal, Theme.Spacing.lg)
                        VariantPicker(
                            variants: detail.variants,
                            selectedId: viewModel.selectedVariantId,
                            onSelect: { viewModel.select(variant: $0) }
                        )
                    }
                }

                if let variant = viewModel.selectedVariant {
                    VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                        PriceTagView(price: variant.price)
                            .accessibilityElement(children: .combine)
                            .accessibilityIdentifier("card-detail-price-tag")
                        PriceHistoryChartView(priceHistory: variant.priceHistory, gradedPriceHistory: variant.gradedPriceHistory)
                            // `.contain`, not `.combine`: the series-picker Menu
                            // inside must stay individually tappable, this
                            // identifier only needs to mark the container.
                            .accessibilityElement(children: .contain)
                            .accessibilityIdentifier("card-detail-price-history")
                        CollectionControlsView(
                            viewModel: viewModel,
                            variant: variant,
                            isWishlisted: detail.viewer?.isWishlisted ?? false
                        )
                    }
                    .padding(Theme.Spacing.lg)
                    .surface()
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
            .padding(.bottom, Theme.Spacing.xl)
        }
    }

    private func heroImage(_ detail: CardDetail) -> some View {
        CachedAsyncImage(url: detail.primaryImageURL) { phase in
            switch phase {
            case .empty:
                heroPlaceholder(systemImage: "photo")
            case .loading:
                heroPlaceholder(systemImage: nil)
            case .success(let image):
                image.resizable().aspectRatio(contentMode: .fit)
            case .failure:
                heroPlaceholder(systemImage: "exclamationmark.triangle")
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 340)
        .background(Theme.Color_.surface)
    }

    private func heroPlaceholder(systemImage: String?) -> some View {
        ZStack {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 40))
                    .foregroundStyle(Theme.Color_.textTertiary)
            } else {
                ProgressView().tint(Theme.Color_.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func identitySection(_ detail: CardDetail) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            Text(detail.name)
                .font(Theme.Typography.display(24))
                .foregroundStyle(Theme.Color_.foreground)

            Text("\(detail.set.franchiseName) · \(detail.set.name)")
                .font(Theme.Typography.body(14))
                .foregroundStyle(Theme.Color_.textSecondary)

            HStack(spacing: Theme.Spacing.sm) {
                Text("#\(detail.number)")
                if let supertype = detail.supertype, !supertype.isEmpty {
                    Text("·")
                    Text(supertype)
                }
            }
            .font(Theme.Typography.mono(13))
            .foregroundStyle(Theme.Color_.textTertiary)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }

}
