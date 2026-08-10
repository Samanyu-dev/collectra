import SwiftUI

/// Shared "card art tile" for collection grid cells (Shelf/Vault/Wishlist) —
/// wraps `CachedAsyncImage` with the standard empty/loading/failure
/// placeholder look, so each feature's cell only supplies a URL and its own
/// badge overlays. Catalog's `CardCell` predates this (Phase 4) and is left
/// as-is rather than touched for a pure DRY nicety on already-shipped,
/// tested code.
struct CardImageTile: View {
    let url: URL?

    var body: some View {
        CachedAsyncImage(url: url) { phase in
            switch phase {
            case .empty:
                placeholder(systemImage: "photo")
            case .loading:
                placeholder(systemImage: nil)
            case .success(let image):
                image.resizable().aspectRatio(contentMode: .fill)
            case .failure:
                placeholder(systemImage: "exclamationmark.triangle")
            }
        }
    }

    private func placeholder(systemImage: String?) -> some View {
        ZStack {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 22))
                    .foregroundStyle(Theme.Color_.textTertiary)
            } else {
                ProgressView().tint(Theme.Color_.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
