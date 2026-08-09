import SwiftUI

/// The one place that switches between loading/signed-out/signed-in — no
/// other view should branch on auth state itself (Phase 3 requirement:
/// "Views should NOT individually inspect/store tokens").
struct RootView: View {
    @EnvironmentObject private var session: SessionManager

    var body: some View {
        Group {
            switch session.state {
            case .loading:
                LaunchLoadingView()
            case .signedOut:
                SignInView()
            case .signedIn:
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.2), value: session.state)
    }
}

private struct LaunchLoadingView: View {
    var body: some View {
        ZStack {
            Theme.Color_.background.ignoresSafeArea()
            VStack(spacing: Theme.Spacing.md) {
                Text("Collectra")
                    .font(Theme.Typography.display(28))
                    .foregroundStyle(Theme.Color_.foreground)
                ProgressView()
                    .tint(Theme.Color_.textSecondary)
            }
        }
    }
}
