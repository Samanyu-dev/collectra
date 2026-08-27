import SwiftUI

/// The one place that switches between loading/signed-out/signed-in — no
/// other view should branch on auth state itself (Phase 3 requirement:
/// "Views should NOT individually inspect/store tokens").
struct RootView: View {
    @EnvironmentObject private var session: SessionManager
    @StateObject private var themeManager = ThemeManager.shared
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    // Declared here, outside the `.id()` reset boundary below, and handed
    // to MainTabView via environment (not created inside it) — so a theme
    // switch's full-tree reset recreates every *view* under `.id()` but
    // keeps this same TabRouter instance, meaning `selectedTab` survives
    // the reset instead of snapping back to Home. Caught by
    // `SetsHomeThemeUITests.testAppearancePickerSwitchesThemeWithoutLosingState`
    // landing on the wrong tab before this fix.
    @StateObject private var tabRouter = TabRouter()

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
                    .environmentObject(tabRouter)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: session.state)
        // Forces one full re-render of everything below when the user picks
        // a different theme in Profile — see ThemeManager's doc comment for
        // why a hard cut here beats threading `@Environment` through every
        // existing `Theme.Color_` call site.
        .id(themeManager.selection)
        // `tabRouter` living on RootView (not MainTabView) is what makes it
        // survive that `.id()` reset — but it means a sign-out/sign-in pair
        // within the same process no longer gets a fresh instance either,
        // so without this a user who signs out from Profile lands right
        // back on Profile after signing back in instead of Home. Caught by
        // `ScanUITests` unexpectedly landing on Profile post-sign-in.
        .onChange(of: session.state) { _, newState in
            if case .signedIn = newState {
                tabRouter.selectedTab = .home
            }
        }
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
            AmbientBackground()
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
