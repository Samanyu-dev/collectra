import SwiftUI

enum AppTab: Hashable {
    case home, catalog, scan, shelf, profile
}

/// Lets a view in one tab (e.g. Shelf's empty state) programmatically
/// switch the active tab (e.g. "Browse Catalog") — the one small piece of
/// shared app-shell state Phase 5's empty-state actions need, injected once
/// by `MainTabView` rather than every screen reaching for `TabView`
/// internals it doesn't own.
@MainActor
final class TabRouter: ObservableObject {
    @Published var selectedTab: AppTab = .home
}
