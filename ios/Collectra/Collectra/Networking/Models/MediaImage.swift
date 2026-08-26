import Foundation

/// Mirrors `SimpleImage` (src/lib/media/resolve.ts) — `{ url, type }` where
/// `type` is a `MediaAttachment.usage` value (e.g. "OFFICIAL_ARTWORK"). The
/// URL already points at whatever provider actually hosts the asset
/// (Vercel Blob / Supabase / Appwrite-signed / external hotlink) — this app
/// never talks to a storage provider directly.
struct MediaImage: Decodable, Equatable, Identifiable {
    let url: String
    let type: String

    var id: String { url }
}

/// Mirrors `pickPrimaryImage` (src/lib/media/pick-primary-image.ts) exactly —
/// same priority order, kept in sync deliberately rather than picking
/// `images.first` (whatever order the API happened to return, not
/// necessarily the best one). `preferSmaller` puts THUMBNAIL ahead of
/// OFFICIAL_ARTWORK for grid contexts, where the full-resolution art is
/// unnecessary network weight; detail views (which want the best available
/// quality for a single hero image) use the default order.
extension Array where Element == MediaImage {
    private static let heroPriority = ["OFFICIAL_ARTWORK", "THUMBNAIL", "EBAY_LISTING_PHOTO", "LISTING_PHOTO"]
    private static let gridPriority = ["THUMBNAIL", "OFFICIAL_ARTWORK", "EBAY_LISTING_PHOTO", "LISTING_PHOTO"]

    func primaryImage(preferSmaller: Bool = false) -> MediaImage? {
        let priority = preferSmaller ? Self.gridPriority : Self.heroPriority
        for type in priority {
            if let match = first(where: { $0.type == type }) {
                return match
            }
        }
        return first
    }

    func primaryImageURL(preferSmaller: Bool = false) -> URL? {
        primaryImage(preferSmaller: preferSmaller).flatMap { URL(string: $0.url) }
    }
}
