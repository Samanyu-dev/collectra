import SwiftUI

/// Shared loading/empty/error scaffold for a collection read screen
/// (Shelf/Vault/Wishlist) — each screen supplies its own grid content for
/// the `.loaded` case plus its own empty-state copy/action, so the
/// state-switch itself (Phase 5 requirement §13/§14) isn't triplicated.
struct CollectionStateView<Content: View>: View {
    let state: CollectionLoadState
    let loadingMessage: String
    let emptyIcon: String
    let emptyTitle: String
    let emptyMessage: String
    let emptyActionTitle: String
    let onEmptyAction: () -> Void
    let onRetry: () -> Void
    @ViewBuilder let content: () -> Content

    var body: some View {
        switch state {
        case .idle, .loading:
            loadingView
        case .error(let message):
            errorView(message: message)
        case .empty:
            emptyView
        case .loaded:
            content()
        }
    }

    private var loadingView: some View {
        VStack(spacing: Theme.Spacing.md) {
            ProgressView().tint(Theme.Color_.textSecondary)
            Text(loadingMessage)
                .font(Theme.Typography.body(13))
                .foregroundStyle(Theme.Color_.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: emptyIcon)
                .font(.system(size: 36))
                .foregroundStyle(Theme.Color_.textTertiary)
            Text(emptyTitle)
                .font(Theme.Typography.body(16, weight: .semibold))
                .foregroundStyle(Theme.Color_.foreground)
            Text(emptyMessage)
                .font(Theme.Typography.body(13))
                .foregroundStyle(Theme.Color_.textSecondary)
                .multilineTextAlignment(.center)
            Button(emptyActionTitle, action: onEmptyAction)
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 220)
                .padding(.top, Theme.Spacing.sm)
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
            Button("Try Again", action: onRetry)
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 200)
        }
        .padding(Theme.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
