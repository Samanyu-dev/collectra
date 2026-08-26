import SwiftUI

/// First-run only — a paged intro shown once before `SignInView`, gated by
/// `hasCompletedOnboarding` in `RootView`. Purely descriptive (no account
/// creation happens here); "Get Started" just sets the flag and hands off
/// to Sign In/Sign Up, which already own that flow.
struct OnboardingView: View {
    private struct Page: Identifiable {
        let id: Int
        let systemImage: String
        let title: String
        let body: String
    }

    private static let pages: [Page] = [
        Page(id: 0, systemImage: "square.grid.2x2.fill", title: "Track your collection",
             body: "Every card you own, organized by set — sports, TCGs, and pop culture, all in one place."),
        Page(id: 1, systemImage: "camera.viewfinder", title: "Scan to add",
             body: "Point your camera at a card. Collectra identifies it, matches the exact variant, and adds it to your Shelf."),
        Page(id: 2, systemImage: "chart.line.uptrend.xyaxis", title: "Real market prices",
             body: "Live pricing pulled from real sales, not a static price guide — know what your collection is worth today."),
        Page(id: 3, systemImage: "books.vertical.fill", title: "Shelf, Vault, Wishlist",
             body: "Track what you own, what's protected, and what you're chasing next."),
    ]

    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var currentPage = 0

    var body: some View {
        ZStack {
            Theme.Color_.background.ignoresSafeArea()

            VStack(spacing: 0) {
                TabView(selection: $currentPage) {
                    ForEach(Self.pages) { page in
                        pageView(page).tag(page.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))

                Button(currentPage == Self.pages.count - 1 ? "Get Started" : "Next") {
                    if currentPage == Self.pages.count - 1 {
                        hasCompletedOnboarding = true
                    } else {
                        withAnimation { currentPage += 1 }
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.bottom, Theme.Spacing.lg)

                if currentPage < Self.pages.count - 1 {
                    Button("Skip") { hasCompletedOnboarding = true }
                        .font(Theme.Typography.body(14))
                        .foregroundStyle(Theme.Color_.textSecondary)
                        .padding(.bottom, Theme.Spacing.md)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func pageView(_ page: Page) -> some View {
        VStack(spacing: Theme.Spacing.lg) {
            Spacer()
            Image(systemName: page.systemImage)
                .font(.system(size: 56))
                .foregroundStyle(Theme.Color_.rarityPromo)
            Text(page.title)
                .font(Theme.Typography.display(24))
                .foregroundStyle(Theme.Color_.foreground)
                .multilineTextAlignment(.center)
            Text(page.body)
                .font(Theme.Typography.body(15))
                .foregroundStyle(Theme.Color_.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.Spacing.xl)
            Spacer()
            Spacer()
        }
    }
}
