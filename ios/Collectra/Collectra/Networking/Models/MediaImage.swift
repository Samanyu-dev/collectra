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
