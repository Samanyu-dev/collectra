import SwiftUI

/// The navigation architecture Phase 4 (Catalog/Card Detail) and Phase 5
/// (Shelf/Vault/Wishlist) build on top of. `TabRouter` lets a screen in one
/// tab (e.g. Shelf's empty state) switch to another (Catalog) — the one
/// piece of shared app-shell state Phase 5 needs.
struct MainTabView: View {
    @StateObject private var tabRouter = TabRouter()

    var body: some View {
        TabView(selection: $tabRouter.selectedTab) {
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(AppTab.home)

            CatalogView()
                .tabItem { Label("Catalog", systemImage: "square.grid.2x2.fill") }
                .tag(AppTab.catalog)

            ScanView()
                .tabItem { Label("Scan", systemImage: "camera.viewfinder") }
                .tag(AppTab.scan)

            ShelfView()
                .tabItem { Label("Shelf", systemImage: "books.vertical.fill") }
                .tag(AppTab.shelf)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                .tag(AppTab.profile)
        }
        .environmentObject(tabRouter)
        .tint(Theme.Color_.foreground)
        .preferredColorScheme(.dark)
    }
}

/// Shared placeholder shell for the screens this phase intentionally leaves
/// empty (Home/Catalog/Shelf) — Phase 4/5 replace the body, not the
/// navigation structure around it.
struct PlaceholderScreen: View {
    let title: String
    let systemImage: String

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Color_.background.ignoresSafeArea()
                VStack(spacing: Theme.Spacing.md) {
                    Image(systemName: systemImage)
                        .font(.system(size: 40))
                        .foregroundStyle(Theme.Color_.textTertiary)
                    Text("\(title) is coming soon")
                        .font(Theme.Typography.body(15))
                        .foregroundStyle(Theme.Color_.textSecondary)
                }
            }
            .navigationTitle(title)
        }
    }
}
