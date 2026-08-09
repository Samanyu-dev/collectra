import SwiftUI

/// Horizontal chip picker over `CardDetail.variants` — the selected chip
/// drives which variant's price/history/collection state `CardDetailView`
/// shows (Phase 4 requirement §6). Never assumes a fixed variant set; always
/// built from whatever the API returned for this specific card.
struct VariantPicker: View {
    let variants: [CardVariant]
    let selectedId: String?
    let onSelect: (CardVariant) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.sm) {
                ForEach(variants) { variant in
                    chip(for: variant)
                }
            }
            .padding(.horizontal, Theme.Spacing.lg)
        }
    }

    private func chip(for variant: CardVariant) -> some View {
        let isSelected = variant.id == selectedId
        return Button {
            onSelect(variant)
        } label: {
            Text(variant.displayName)
                .font(Theme.Typography.body(13, weight: .semibold))
                .foregroundStyle(isSelected ? Theme.Color_.background : Theme.Color_.foreground)
                .padding(.horizontal, Theme.Spacing.md)
                .padding(.vertical, Theme.Spacing.sm)
                .background(isSelected ? Theme.Color_.foreground : Theme.Color_.surface)
                .clipShape(Capsule())
                .overlay(
                    Capsule().strokeBorder(Theme.Color_.border, lineWidth: isSelected ? 0 : 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("variant-chip-\(variant.id)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
