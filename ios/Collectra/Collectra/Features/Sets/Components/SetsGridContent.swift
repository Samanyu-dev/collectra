import SwiftUI

/// The sets grid + load/empty/error states, structurally identical to
/// `CardsGridContent` (see that file's doc comment for why the two aren't
/// merged into one generic). Does NOT own a `NavigationStack`.
struct SetsGridContent: View {
    @ObservedObject var viewModel: SetsViewModel

    private let columns = [
        GridItem(.flexible(), spacing: Theme.Spacing.md),
        GridItem(.flexible(), spacing: Theme.Spacing.md),
    ]

    var body: some View {
        content
            .onAppear { viewModel.onAppear() }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .idle:
            Color.clear
        case .loading where viewModel.items.isEmpty:
            loadingView
        case .error(let message):
            errorView(message: message)
        case .empty:
            emptyView
        default:
            gridView
        }
    }

    private var gridView: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: Theme.Spacing.lg) {
                ForEach(viewModel.items) { set in
                    NavigationLink(value: set) {
                        SetCell(set: set)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("sets-grid-cell")
                    .onAppear { viewModel.loadNextPageIfNeeded(currentItem: set) }
                }
            }
            .padding(Theme.Spacing.md)

            if viewModel.isLoadingNextPage {
                ProgressView()
                    .tint(Theme.Color_.textSecondary)
                    .padding(.vertical, Theme.Spacing.md)
            }

            if let message = viewModel.paginationErrorMessage {
                VStack(spacing: Theme.Spacing.sm) {
                    Text(message)
                        .font(Theme.Typography.body(12))
                        .foregroundStyle(Theme.Color_.destructive)
                    Button("Retry") { viewModel.retryNextPage() }
                        .font(Theme.Typography.body(12, weight: .semibold))
                        .foregroundStyle(Theme.Color_.foreground)
                }
                .padding(.bottom, Theme.Spacing.md)
            }
        }
        .refreshable { await viewModel.refresh() }
        .overlay(alignment: .top) {
            if viewModel.loadState == .loading && !viewModel.items.isEmpty {
                ProgressView()
                    .tint(Theme.Color_.textSecondary)
                    .padding(.top, Theme.Spacing.sm)
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: Theme.Spacing.md) {
            ProgressView().tint(Theme.Color_.textSecondary)
            Text("Loading sets…")
                .font(Theme.Typography.body(13))
                .foregroundStyle(Theme.Color_.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: "square.stack")
                .font(.system(size: 36))
                .foregroundStyle(Theme.Color_.textTertiary)
            Text(viewModel.searchText.isEmpty ? "No sets found" : "No results for \u{201C}\(viewModel.searchText)\u{201D}")
                .font(Theme.Typography.body(15, weight: .medium))
                .foregroundStyle(Theme.Color_.textSecondary)
                .multilineTextAlignment(.center)
            if !viewModel.searchText.isEmpty {
                Button("Clear Search") { viewModel.clearSearch() }
                    .font(Theme.Typography.body(14, weight: .semibold))
                    .foregroundStyle(Theme.Color_.foreground)
            }
        }
        .padding(Theme.Spacing.xl)
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
}
