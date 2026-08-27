import SwiftUI

/// One Shelf grid cell — image, name, set, selected-variant label, quantity,
/// price, and favorite/wishlist indicators (Phase 5 requirement §3).
/// Deliberately shows no vault indicator: `ShelfItem` (mirroring the
/// backend's `CollectionItem`) has no `isVaulted` field — Vault is a
/// separate concept surfaced only through its own screen/endpoint, per the
/// backend's own semantics.
struct ShelfCell: View {
    let item: ShelfItem

    private var variantLabel: String {
        let parts = [item.parallelName, item.printingName].compactMap { $0 }
        return parts.isEmpty ? "Base" : parts.joined(separator: " · ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CardImageTile(url: item.primaryImageURL)
                .aspectRatio(0.72, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .background(Theme.Color_.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                        .strokeBorder(Theme.Color_.border, lineWidth: 1)
                )
                .cardFrame(cornerRadius: Theme.Radius.md)
                .overlay(alignment: .topLeading) {
                    if item.isFavorite {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.Color_.destructive)
                            .padding(6)
                    }
                }
                .overlay(alignment: .topTrailing) {
                    if item.quantity > 1 {
                        Text("×\(item.quantity)")
                            .font(Theme.Typography.mono(11, weight: .semibold))
                            .foregroundStyle(Theme.Color_.background)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Theme.Color_.foreground)
                            .clipShape(Capsule())
                            .padding(6)
                    }
                }

            VStack(alignment: .leading, spacing: 3) {
                Text(item.cardName)
                    .font(Theme.Typography.body(13, weight: .semibold))
                    .foregroundStyle(Theme.Color_.foreground)
                    .lineLimit(1)
                Text("\(item.setName) · \(variantLabel)")
                    .font(Theme.Typography.body(11))
                    .foregroundStyle(Theme.Color_.textSecondary)
                    .lineLimit(1)
                PriceTagView(price: item.price, compact: true)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item.cardName), \(item.setName), quantity \(item.quantity)")
    }
}
