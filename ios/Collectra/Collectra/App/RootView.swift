import SwiftUI

/// The one place that switches between loading/signed-out/signed-in — no
/// other view should branch on auth state itself (Phase 3 requirement:
/// "Views should NOT individually inspect/store tokens").
struct RootView: View {
    @EnvironmentObject private var session: SessionManager
    @StateObject private var themeManager = ThemeManager.shared
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    var body: some View {
        Group {
            switch session.state {
            case .loading:
                LaunchLoadingView()
            case .signedOut:
                if hasCompletedOnboarding {
                    SignInView()
                } else {
                    OnboardingView()
                }
            case .signedIn:
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.2), value: session.state)
        // Forces one full re-render of everything below when the user picks
        // a different theme in Profile — see ThemeManager's doc comment for
        // why a hard cut here beats threading `@Environment` through every
        // existing `Theme.Color_` call site.
        .id(themeManager.selection)
    }
}

/// Shown for exactly as long as `SessionManager` takes to resolve whatever
/// session the SDK restored from Keychain — no artificial minimum-display
/// timer, matching this codebase's existing refusal to fake a delay
/// (see `ShelfViewModel`'s doc comment on the same point). The fade/scale-in
/// is purely decorative motion on top of that real duration, not a
/// substitute for one.
private struct LaunchLoadingView: View {
    @State private var hasAppeared = false

    var body: some View {
        ZStack {
            Theme.Color_.background.ignoresSafeArea()
            VStack(spacing: Theme.Spacing.lg) {
                Text("Collectra")
                    .font(Theme.Typography.display(34))
                    .foregroundStyle(Theme.Color_.foreground)
                    .opacity(hasAppeared ? 1 : 0)
                    .scaleEffect(hasAppeared ? 1 : 0.9)

                Capsule()
                    .fill(Theme.Color_.rarityPromo)
                    .frame(width: hasAppeared ? 48 : 0, height: 3)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5)) {
                hasAppeared = true
            }
        }
    }
}
