import SwiftUI

/// One Vault grid cell — visually distinct from Shelf (Phase 5 requirement
/// §4): an amber accent border + a lock badge rather than Shelf's plain
/// neutral tile, so the two screens never look interchangeable.
struct VaultCell: View {
    let item: VaultItem

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CardImageTile(url: item.primaryImageURL)
                .aspectRatio(0.72, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .background(Theme.Color_.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                        .strokeBorder(Theme.Color_.raritySAR.opacity(0.6), lineWidth: 1.5)
                )
                .overlay(alignment: .topLeading) {
                    if item.isFavorite {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.Color_.destructive)
                            .padding(6)
                    }
                }
                .overlay(alignment: .topTrailing) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Theme.Color_.background)
                        .padding(5)
                        .background(Theme.Color_.raritySAR)
                        .clipShape(Circle())
                        .padding(6)
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
                HStack(spacing: 6) {
                    Text(item.estimatedValue, format: .currency(code: "USD"))
                        .font(Theme.Typography.mono(12, weight: .semibold))
                        .foregroundStyle(Theme.Color_.foreground)
                    if let cert = item.certification {
                        Text("\(cert.company) \(cert.grade)")
                            .font(Theme.Typography.mono(10, weight: .semibold))
                            .foregroundStyle(Theme.Color_.raritySAR)
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item.name), \(item.setName), vaulted")
    }
}
