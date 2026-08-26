import SwiftUI

/// One full color token set — exactly the fields `Theme.Color_` exposes.
/// `ThemeManager` picks which instance is "current"; `Theme.Color_`'s
/// properties read through to it (see that file), so every existing
/// `Theme.Color_.x` call site across the app stays unchanged and simply
/// reflects whichever palette is active.
struct ThemePalette: Equatable {
    let background: Color
    let surface: Color
    let elevated: Color
    let foreground: Color
    let textSecondary: Color
    let textTertiary: Color
    let border: Color
    let destructive: Color

    let rarityCommon: Color
    let rarityUncommon: Color
    let rarityRare: Color
    let rarityHolo: Color
    let rarityUltra: Color
    let rarityIllustration: Color
    let raritySAR: Color
    let rarityHyper: Color
    let raritySecret: Color
    let rarityPromo: Color

    /// Today's exact values (src/app/globals.css's "the app is invisible,
    /// cards are the color" identity) — the out-of-the-box default, so the
    /// prior "not a pixel clone" decision stays the experience until someone
    /// explicitly opts into Vibrant from Profile.
    static let minimal = ThemePalette(
        background: Color(hex: 0x121212),
        surface: Color(hex: 0x1A1A1A),
        elevated: Color(hex: 0x242424),
        foreground: Color(hex: 0xF5F5F5),
        textSecondary: Color(hex: 0x8C8C8C),
        textTertiary: Color(hex: 0x595959),
        border: Color.white.opacity(0.08),
        destructive: Color(hex: 0xE5484D),
        rarityCommon: Color(hex: 0x8B8B8B),
        rarityUncommon: Color(hex: 0x4ADE80),
        rarityRare: Color(hex: 0x60A5FA),
        rarityHolo: Color(hex: 0x818CF8),
        rarityUltra: Color(hex: 0xC084FC),
        rarityIllustration: Color(hex: 0xF472B6),
        raritySAR: Color(hex: 0xFB923C),
        rarityHyper: Color(hex: 0xF43F5E),
        raritySecret: Color(hex: 0xFACC15),
        rarityPromo: Color(hex: 0x2DD4BF)
    )

    /// A bolder, getcollectr-inspired pass — near-black ground, a bright
    /// cyan interactive accent (reused as `rarityPromo`, the closest
    /// existing slot to a general "accent"), amplified saturation across the
    /// rarity ramp. First draft, meant to be tuned once seen on-device, not
    /// a final spec.
    static let vibrant = ThemePalette(
        background: Color(hex: 0x0A0A0A),
        surface: Color(hex: 0x141414),
        elevated: Color(hex: 0x1E1E1E),
        foreground: Color(hex: 0xFFFFFF),
        textSecondary: Color(hex: 0x9A9A9A),
        textTertiary: Color(hex: 0x666666),
        border: Color(hex: 0x22D3EE, opacity: 0.15),
        destructive: Color(hex: 0xFF3B5C),
        rarityCommon: Color(hex: 0x9CA3AF),
        rarityUncommon: Color(hex: 0x22FF88),
        rarityRare: Color(hex: 0x22D3EE),
        rarityHolo: Color(hex: 0x818CF8),
        rarityUltra: Color(hex: 0xD946EF),
        rarityIllustration: Color(hex: 0xFF4FA3),
        raritySAR: Color(hex: 0xFF8A00),
        rarityHyper: Color(hex: 0xFF1744),
        raritySecret: Color(hex: 0xFFD600),
        rarityPromo: Color(hex: 0x22D3EE)
    )
}
