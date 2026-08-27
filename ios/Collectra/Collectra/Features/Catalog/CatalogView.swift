import SwiftUI

/// Phase 4 (Cards) + iOS Sets/Home/Theming phase (Sets): the Catalog tab
/// root. `Cards | Sets` segmented switcher over one shared `NavigationStack`
/// — same idiom `ShelfView` already established for Shelf/Vault/Wishlist —
/// so pushing a card or set detail and popping back preserves both grids'
/// search text/results/scroll position (both view models stay alive as
/// `@StateObject`s regardless of which segment is showing).
struct CatalogView: View {
    private enum Section: String, CaseIterable, Identifiable {
        case cards = "Cards"
        case sets = "Sets"
        var id: String { rawValue }
    }

    @State private var section: Section = .cards
    @StateObject private var cardsViewModel = CatalogViewModel()
    @StateObject private var setsViewModel = SetsViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()
                Group {
                    switch section {
                    case .cards:
                        CardsGridContent(viewModel: cardsViewModel)
                    case .sets:
                        SetsGridContent(viewModel: setsViewModel)
                    }
                }
            }
            .navigationTitle("Catalog")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("Section", selection: $section) {
                        ForEach(Section.allCases) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 180)
                }
            }
            .searchable(text: searchTextBinding, placement: .navigationBarDrawer(displayMode: .always), prompt: searchPrompt)
            .onChange(of: searchTextBinding.wrappedValue) { _, _ in onSearchTextChanged() }
            .onSubmit(of: .search) { submitSearchNow() }
            .navigationDestination(for: CardSummary.self) { card in
                CardDetailView(cardId: card.id, cardName: card.name)
            }
            .navigationDestination(for: SetSummary.self) { set in
                SetDetailView(setId: set.id, setName: set.name)
            }
        }
        .preferredColorScheme(.dark)
    }

    private var searchTextBinding: Binding<String> {
        switch section {
        case .cards: return $cardsViewModel.searchText
        case .sets: return $setsViewModel.searchText
        }
    }

    private var searchPrompt: String {
        switch section {
        case .cards: return "Search cards, sets, players…"
        case .sets: return "Search sets…"
        }
    }

    private func onSearchTextChanged() {
        switch section {
        case .cards: cardsViewModel.onSearchTextChanged()
        case .sets: setsViewModel.onSearchTextChanged()
        }
    }

    private func submitSearchNow() {
        switch section {
        case .cards: cardsViewModel.submitSearchNow()
        case .sets: setsViewModel.submitSearchNow()
        }
    }
}
