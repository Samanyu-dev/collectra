import SwiftUI

/// One sets-grid cell — cover art, name, franchise, and (when signed in and
/// non-zero) an owned-progress bar + value, mirroring the web `/collections`
/// index tile.
struct SetCell: View {
    let set: SetSummary

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            imageView
                .aspectRatio(4.0 / 3.0, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .background(Theme.Color_.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
                .overlay(alignment: .bottom) {
                    if set.percentOwned > 0 {
                        GeometryReader { geo in
                            Rectangle()
                                .fill(Theme.Color_.rarityUncommon)
                                .frame(width: geo.size.width * set.percentOwned, height: 3)
                        }
                        .frame(height: 3)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                        .strokeBorder(Theme.Color_.border, lineWidth: 1)
                )
                .cardFrame(cornerRadius: Theme.Radius.md)

            VStack(alignment: .leading, spacing: 3) {
                Text(set.name)
                    .font(Theme.Typography.body(13, weight: .semibold))
                    .foregroundStyle(Theme.Color_.foreground)
                    .lineLimit(1)

                if set.ownedCount > 0 {
                    Text("\(set.ownedCount)/\(set.printedTotal) owned · $\(set.totalValueUsd, specifier: "%.0f")")
                        .font(Theme.Typography.mono(11))
                        .foregroundStyle(Theme.Color_.textSecondary)
                        .lineLimit(1)
                } else {
                    Text("\(set.seriesName) · \(set.printedTotal) cards")
                        .font(Theme.Typography.body(11))
                        .foregroundStyle(Theme.Color_.textSecondary)
                        .lineLimit(1)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(set.name), \(set.franchiseName)")
    }

    private var imageView: some View {
        CachedAsyncImage(url: set.imageURL, targetSize: CGSize(width: 220, height: 165)) { phase in
            switch phase {
            case .empty:
                placeholderTile(systemImage: "square.stack")
            case .loading:
                placeholderTile(systemImage: nil)
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .padding(Theme.Spacing.sm)
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
