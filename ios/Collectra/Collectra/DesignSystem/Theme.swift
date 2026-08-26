import SwiftUI

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

/// Carries the web app's dark-first, near-monochrome identity
/// (src/app/globals.css: "The app is invisible. Cards are the color.")
/// into native SwiftUI — approximated from its OKLCH tokens into sRGB
/// (exact OKLCH conversion isn't critical here; the perceptual intent —
/// near-black ground, elevated card surfaces, near-white text — is what
/// carries over). This is a distinct native app, not a pixel clone of the
/// web layout or of the competitor Collectr's UI.
enum Theme {
    /// Every property here reads through to `ThemeManager.shared.palette`
    /// (see ThemeManager's doc comment for why this is a static read rather
    /// than an `@Environment` value) — Minimal's exact original hex values
    /// live on as `ThemePalette.minimal`, the default until a user picks
    /// Vibrant from Profile.
    @MainActor
    enum Color_ {
        static var background: Color { ThemeManager.shared.palette.background }
        static var surface: Color { ThemeManager.shared.palette.surface }
        static var elevated: Color { ThemeManager.shared.palette.elevated }
        static var foreground: Color { ThemeManager.shared.palette.foreground }
        static var textSecondary: Color { ThemeManager.shared.palette.textSecondary }
        static var textTertiary: Color { ThemeManager.shared.palette.textTertiary }
        static var border: Color { ThemeManager.shared.palette.border }
        static var destructive: Color { ThemeManager.shared.palette.destructive }

        static var rarityCommon: Color { ThemeManager.shared.palette.rarityCommon }
        static var rarityUncommon: Color { ThemeManager.shared.palette.rarityUncommon }
        static var rarityRare: Color { ThemeManager.shared.palette.rarityRare }
        static var rarityHolo: Color { ThemeManager.shared.palette.rarityHolo }
        static var rarityUltra: Color { ThemeManager.shared.palette.rarityUltra }
        static var rarityIllustration: Color { ThemeManager.shared.palette.rarityIllustration }
        static var raritySAR: Color { ThemeManager.shared.palette.raritySAR }
        static var rarityHyper: Color { ThemeManager.shared.palette.rarityHyper }
        static var raritySecret: Color { ThemeManager.shared.palette.raritySecret }
        static var rarityPromo: Color { ThemeManager.shared.palette.rarityPromo }
    }

    enum Typography {
        // TODO: bundle the actual Space Grotesk .ttf (OFL-licensed, same as
        // the web app) once the font files can be added to the project —
        // this sandbox couldn't reach fonts.gstatic.com/raw.githubusercontent.com
        // to fetch them. SF Rounded is a deliberate native-feeling
        // placeholder in the meantime, not a permanent substitution.
        static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
            .system(size: size, weight: weight, design: .rounded)
        }

        static func body(_ size: CGFloat = 17, weight: Font.Weight = .regular) -> Font {
            .system(size: size, weight: weight, design: .default)
        }

        static func mono(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font {
            .system(size: size, weight: weight, design: .monospaced)
        }
    }

    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 22
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }
}

/// A card-style elevated surface — the recurring container the web design
/// system uses everywhere ("Cards are the color").
struct SurfaceBackground: ViewModifier {
    var elevated: Bool = false

    func body(content: Content) -> some View {
        content
            .background(elevated ? Theme.Color_.elevated : Theme.Color_.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                    .strokeBorder(Theme.Color_.border, lineWidth: 1)
            )
    }
}

extension View {
    func surface(elevated: Bool = false) -> some View {
        modifier(SurfaceBackground(elevated: elevated))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Typography.body(17, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Theme.Color_.foreground)
            .foregroundStyle(Theme.Color_.background)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
