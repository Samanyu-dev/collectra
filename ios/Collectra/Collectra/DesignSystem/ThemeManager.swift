import SwiftUI

/// Which `ThemePalette` is active, user-selectable from Profile and
/// persisted across launches. `Theme.Color_` reads `ThemeManager.shared.
/// palette` directly (a plain static read, not observed on its own) — the
/// app root holds this as an `@StateObject` and applies `.id(themeManager.
/// selection)` so picking a new theme forces one clean full-tree re-render
/// (every `Theme.Color_.x` re-evaluates against the new palette) rather than
/// requiring `@Environment`/`@EnvironmentObject` plumbing through every one
/// of the ~25 files that already reference `Theme.Color_` — a theme switch
/// is a rare, deliberate action, so a hard visual cut (not an animated
/// cross-fade) is an acceptable trade for not touching every existing view.
@MainActor
final class ThemeManager: ObservableObject {
    enum Selection: String, CaseIterable, Identifiable {
        case minimal = "Minimal"
        case vibrant = "Vibrant"
        var id: String { rawValue }

        var palette: ThemePalette {
            switch self {
            case .minimal: return .minimal
            case .vibrant: return .vibrant
            }
        }
    }

    static let shared = ThemeManager()

    @AppStorage("selectedTheme") private var storedSelection: String = Selection.minimal.rawValue

    @Published var selection: Selection = .minimal {
        didSet { storedSelection = selection.rawValue }
    }

    var palette: ThemePalette { selection.palette }

    private init() {
        selection = Selection(rawValue: storedSelection) ?? .minimal
    }
}
