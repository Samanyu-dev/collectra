import SwiftUI

/// The Home tab — portfolio value, today's change, a "Top Cards You Own"
/// rail, and recent activity, from `GET /api/v1/dashboard`. Replaces the
/// placeholder this tab shipped with (see git history: "Phase 4/5 will
/// build the real dashboard here").
struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()
                CollectionStateView(
                    state: viewModel.loadState,
                    loadingMessage: "Loading your collection…",
                    emptyIcon: "sparkles",
                    emptyTitle: "Nothing tracked yet",
                    emptyMessage: "Scan or add a card to see your portfolio value and top pulls here.",
                    emptyActionTitle: "Browse Catalog",
                    onEmptyAction: {}, // TabRouter isn't available here without threading it in; the Catalog tab icon is one tap away.
                    onRetry: { viewModel.retry() }
                ) {
                    if let summary = viewModel.summary {
                        content(summary)
                    }
                }
            }
            .navigationTitle("Home")
            .navigationDestination(for: CardNavigationTarget.self) { target in
                CardDetailView(cardId: target.cardId, cardName: target.cardName)
            }
        }
        .onAppear { viewModel.onAppear() }
        .preferredColorScheme(.dark)
    }

    private func content(_ summary: DashboardSummary) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.xl) {
                portfolioCard(summary)

                if !summary.topOwnedValuable.isEmpty {
                    topValuableSection(summary.topOwnedValuable)
                }

                if !summary.recentActivity.isEmpty {
                    activitySection(summary.recentActivity)
                }
            }
            .padding(.vertical, Theme.Spacing.md)
        }
        .refreshable { await viewModel.refresh() }
    }

    private func portfolioCard(_ summary: DashboardSummary) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Portfolio Value")
                .font(Theme.Typography.body(12, weight: .medium))
                .foregroundStyle(Theme.Color_.textSecondary)

            Text(summary.portfolioValueUsd, format: .currency(code: "USD"))
                .font(Theme.Typography.display(34))
                .foregroundStyle(Theme.Color_.foreground)
                .accessibilityIdentifier("home-portfolio-value")

            if let change = summary.changeToday {
                HStack(spacing: 4) {
                    Image(systemName: change.changeAbs >= 0 ? "arrow.up.right" : "arrow.down.right")
                    Text(change.changeAbs, format: .currency(code: "USD"))
                    if let percent = change.changePercent {
                        Text("(\(percent, specifier: "%.1f")%)")
                    }
                    Text("today").foregroundStyle(Theme.Color_.textTertiary)
                }
                .font(Theme.Typography.mono(13, weight: .semibold))
                .foregroundStyle(change.changeAbs >= 0 ? Theme.Color_.rarityUncommon : Theme.Color_.destructive)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.Spacing.lg)
        .surface(elevated: true)
        .padding(.horizontal, Theme.Spacing.md)
    }

    private func topValuableSection(_ cards: [DashboardSummary.TopValuableCard]) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("TOP CARDS YOU OWN")
                .font(Theme.Typography.mono(11, weight: .semibold))
                .foregroundStyle(Theme.Color_.textTertiary)
                .padding(.horizontal, Theme.Spacing.md)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.md) {
                    ForEach(Array(cards.enumerated()), id: \.element.id) { index, card in
                        NavigationLink(value: CardNavigationTarget(cardId: card.cardId, cardName: card.cardName)) {
                            TopValuableCardCell(card: card, isTopRanked: index == 0)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("home-top-valuable-cell")
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
        }
    }

    private func activitySection(_ activity: [DashboardSummary.ActivityEntry]) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("RECENT ACTIVITY")
                .font(Theme.Typography.mono(11, weight: .semibold))
                .foregroundStyle(Theme.Color_.textTertiary)
                .padding(.horizontal, Theme.Spacing.md)

            VStack(spacing: 0) {
                ForEach(activity) { entry in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(entry.actionLabel) \(entry.count) card\(entry.count == 1 ? "" : "s")")
                                .font(Theme.Typography.body(14, weight: .medium))
                                .foregroundStyle(Theme.Color_.foreground)
                            if let setName = entry.setName {
                                Text(setName)
                                    .font(Theme.Typography.body(12))
                                    .foregroundStyle(Theme.Color_.textSecondary)
                            }
                        }
                        Spacer()
                        Text(entry.latestTimestamp, style: .relative)
                            .font(Theme.Typography.mono(11))
                            .foregroundStyle(Theme.Color_.textTertiary)
                    }
                    .padding(Theme.Spacing.md)
                    .accessibilityIdentifier("home-activity-row")
                    if entry.id != activity.last?.id {
                        Divider().background(Theme.Color_.border)
                    }
                }
            }
            .surface()
            .padding(.horizontal, Theme.Spacing.md)
        }
    }
}

/// One "Top Cards You Own" rail cell. `isTopRanked` mirrors the web app's
/// foil-frame convention (see globals.css's `.foil-frame`) — a slow-spinning
/// rainbow border reserved for "the one that matters" (your #1 owned card,
/// there only, not every card), carried over here as the same visual idea
/// in native form rather than porting the CSS mechanism.
private struct TopValuableCardCell: View {
    let card: DashboardSummary.TopValuableCard
    let isTopRanked: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            CardImageTile(url: card.imageURL, targetSize: CGSize(width: 110, height: 153))
                .aspectRatio(0.72, contentMode: .fit)
                .frame(width: 110)
                .background(Theme.Color_.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                        .strokeBorder(isTopRanked ? card.rarityColor : Theme.Color_.border, lineWidth: isTopRanked ? 2 : 1)
                )
                .cardFrame(cornerRadius: Theme.Radius.md)
                .shadow(color: isTopRanked ? card.rarityColor.opacity(0.5) : .clear, radius: 8)

            Text(card.cardName)
                .font(Theme.Typography.body(12, weight: .semibold))
                .foregroundStyle(Theme.Color_.foreground)
                .lineLimit(1)
                .frame(width: 110, alignment: .leading)

            Text(card.marketPriceUsd, format: .currency(code: "USD"))
                .font(Theme.Typography.mono(11))
                .foregroundStyle(Theme.Color_.textSecondary)
        }
    }
}
