import SwiftUI

/// Phase 5: the Shelf tab root. Houses Shelf itself plus native access to
/// Vault and Wishlist via a segmented switcher (Phase 5 requirement §12),
/// all under one `NavigationStack` so opening a card from any of the three
/// pushes the same `CardDetailView` (Phase 4) and "Back" returns to
/// whichever collection screen was showing.
struct ShelfView: View {
    private enum Section: String, CaseIterable, Identifiable {
        case shelf = "Shelf"
        case vault = "Vault"
        case wishlist = "Wishlist"
        var id: String { rawValue }
    }

    @EnvironmentObject private var tabRouter: TabRouter
    @State private var section: Section = .shelf
    @StateObject private var shelfViewModel = ShelfViewModel()
    @StateObject private var vaultViewModel = VaultViewModel()
    @StateObject private var wishlistViewModel = WishlistViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Color_.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    Picker("Section", selection: $section) {
                        ForEach(Section.allCases) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(Theme.Spacing.md)

                    Group {
                        switch section {
                        case .shelf:
                            ShelfContentView(viewModel: shelfViewModel, onBrowseCatalog: goToCatalog)
                        case .vault:
                            VaultView(viewModel: vaultViewModel, onBrowseCatalog: goToCatalog)
                        case .wishlist:
                            WishlistView(viewModel: wishlistViewModel, onBrowseCatalog: goToCatalog)
                        }
                    }
                }
            }
            .navigationTitle(section.rawValue)
            .navigationDestination(for: CardNavigationTarget.self) { target in
                CardDetailView(cardId: target.cardId, cardName: target.cardName)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func goToCatalog() {
        tabRouter.selectedTab = .catalog
    }
}

/// Shared 2-column grid layout used by Shelf/Vault/Wishlist content views.
enum CollectionGridLayout {
    static let columns = [
        GridItem(.flexible(), spacing: Theme.Spacing.md),
        GridItem(.flexible(), spacing: Theme.Spacing.md),
    ]
}
