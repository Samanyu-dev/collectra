import SwiftUI

/// One Wishlist grid cell — image, identity, set, price, and an alert badge
/// when the card has crossed the user's price-alert threshold (Phase 5
/// requirement §5).
struct WishlistCell: View {
    let item: WishlistItem

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
                .overlay(alignment: .topTrailing) {
                    if item.alertTriggered {
                        Image(systemName: "bell.badge.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.Color_.rarityUncommon)
                            .padding(6)
                    }
                }

            VStack(alignment: .leading, spacing: 3) {
                Text(item.name)
                    .font(Theme.Typography.body(13, weight: .semibold))
                    .foregroundStyle(Theme.Color_.foreground)
                    .lineLimit(1)
                Text(item.setName)
                    .font(Theme.Typography.body(11))
                    .foregroundStyle(Theme.Color_.textSecondary)
                    .lineLimit(1)
                PriceTagView(price: item.price, compact: true)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item.name), \(item.setName)")
    }
}
