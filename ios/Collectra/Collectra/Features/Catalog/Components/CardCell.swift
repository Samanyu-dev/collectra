import SwiftUI

/// One catalog grid cell — image, name, set, and current price at minimum
/// (Phase 4 requirement §5). Deliberately omits a rarity accent: neither
/// `Card` nor `Variant` carries a rarity field in the current schema
/// (checked prisma/schema.prisma — this is a football/TCG catalog organized
/// by Insert/Parallel, not a rarity tier), so `/api/v1/cards` genuinely has
/// none to show yet. Theme's rarity palette stays reserved for when/if that
/// data exists rather than being faked here.
struct CardCell: View {
    let card: CardSummary

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            imageView
                .aspectRatio(0.72, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .background(Theme.Color_.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                        .strokeBorder(Theme.Color_.border, lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(card.name)
                    .font(Theme.Typography.body(13, weight: .semibold))
                    .foregroundStyle(Theme.Color_.foreground)
                    .lineLimit(1)

                Text(card.setName)
                    .font(Theme.Typography.body(11))
                    .foregroundStyle(Theme.Color_.textSecondary)
                    .lineLimit(1)

                HStack {
                    PriceTagView(price: card.price, compact: true)
                    Spacer(minLength: 4)
                    if card.ownedQuantity > 0 {
                        Text("×\(card.ownedQuantity)")
                            .font(Theme.Typography.mono(11, weight: .semibold))
                            .foregroundStyle(Theme.Color_.rarityUncommon)
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(card.name), \(card.setName)")
    }

    private var imageView: some View {
        CachedAsyncImage(url: card.primaryImageURL) { phase in
            switch phase {
            case .empty:
                placeholderTile(systemImage: "photo")
            case .loading:
                placeholderTile(systemImage: nil)
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            case .failure:
                placeholderTile(systemImage: "exclamationmark.triangle")
            }
        }
    }

    private func placeholderTile(systemImage: String?) -> some View {
        ZStack {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 22))
                    .foregroundStyle(Theme.Color_.textTertiary)
            } else {
                ProgressView()
                    .tint(Theme.Color_.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
