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
    enum Color_ {
        static let background = Color(hex: 0x121212)
        static let surface = Color(hex: 0x1A1A1A)
        static let elevated = Color(hex: 0x242424)
        static let foreground = Color(hex: 0xF5F5F5)
        static let textSecondary = Color(hex: 0x8C8C8C)
        static let textTertiary = Color(hex: 0x595959)
        static let border = Color.white.opacity(0.08)
        static let destructive = Color(hex: 0xE5484D)

        // Rarity accent hierarchy — identical hex values to
        // src/app/globals.css's --color-rarity-* tokens (already sRGB, no
        // conversion needed), so a card's rarity reads the same color on
        // iOS as on the web.
        static let rarityCommon = Color(hex: 0x8B8B8B)
        static let rarityUncommon = Color(hex: 0x4ADE80)
        static let rarityRare = Color(hex: 0x60A5FA)
        static let rarityHolo = Color(hex: 0x818CF8)
        static let rarityUltra = Color(hex: 0xC084FC)
        static let rarityIllustration = Color(hex: 0xF472B6)
        static let raritySAR = Color(hex: 0xFB923C)
        static let rarityHyper = Color(hex: 0xF43F5E)
        static let raritySecret = Color(hex: 0xFACC15)
        static let rarityPromo = Color(hex: 0x2DD4BF)
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
