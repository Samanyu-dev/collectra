import SwiftUI

/// The iOS analog of web's ambient body background (globals.css, "Vault
/// Spotlight" + "Foil Sheen") — same two-layer treatment, same constraint
/// ("the app is invisible, cards are the color": `Theme.Color_.background`
/// is still the true base color everywhere else, this only adds a
/// near-imperceptible top-lit falloff plus a slow-drifting sheen in the same
/// five hues `.foil-frame`/the card foil border already animate on
/// individual Legendary pulls, turned down to ambient volume).
///
/// Drop-in replacement for the `Theme.Color_.background.ignoresSafeArea()`
/// pattern every root screen used before — same call site, same
/// `ignoresSafeArea()` behavior, just layered.
struct AmbientBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var animate = false

    private static let foilHues: [Color] = [
        Color(hex: 0xFF5F6D), Color(hex: 0xFFC371), Color(hex: 0x4ADE80),
        Color(hex: 0x60A5FA), Color(hex: 0xC084FC), Color(hex: 0xFF5F6D),
    ]

    var body: some View {
        ZStack {
            Theme.Color_.background

            EllipticalGradient(
                colors: [Color.white.opacity(0.05), .clear, Color.black.opacity(0.10)],
                center: UnitPoint(x: 0.5, y: -0.15),
                startRadiusFraction: 0,
                endRadiusFraction: 0.85
            )

            LinearGradient(
                colors: Self.foilHues,
                startPoint: animate ? .bottomLeading : .topTrailing,
                endPoint: animate ? .topTrailing : .bottomLeading
            )
            .opacity(0.06)
            .blendMode(.softLight)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 17).repeatForever(autoreverses: true)) {
                    animate = true
                }
            }
        }
        .ignoresSafeArea()
    }
}
