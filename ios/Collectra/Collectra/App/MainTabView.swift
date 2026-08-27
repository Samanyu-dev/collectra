import SwiftUI

/// The app's tab shell. `TabRouter` lets a screen in one tab (e.g. Shelf's
/// empty state) switch to another (Catalog) — the one piece of shared
/// app-shell state that needs to live above any single tab. Owned by
/// `RootView` (not here) and handed down via environment, so it survives
/// RootView's theme-switch `.id()` reset instead of resetting
/// `selectedTab` back to Home every time — see RootView's doc comment.
struct MainTabView: View {
    @EnvironmentObject private var tabRouter: TabRouter

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
        .tint(Theme.Color_.foreground)
        .preferredColorScheme(.dark)
    }
}
