import SwiftUI
import UIKit
import ImageIO

/// Process-wide in-memory image cache keyed by absolute URL string + target
/// pixel size (the same URL requested at two different sizes — a grid
/// thumbnail vs. a detail hero — are legitimately different decodes, not a
/// cache collision). Backed by `NSCache` with a byte-based `totalCostLimit`
/// (not the flat 300-item count this used before decode-size awareness
/// existed), so eviction reflects real memory pressure instead of item
/// count alone. Deliberately not a third-party dependency (this app has
/// none besides Supabase); `URLSession`'s own `URLCache` still gives
/// disk-level caching underneath for free.
actor ImageCache {
    static let shared = ImageCache()

    private let cache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.totalCostLimit = 150 * 1024 * 1024 // ~150MB of decoded pixel data
        return cache
    }()

    /// Dedupes concurrent requests for the same URL+size — e.g. a card
    /// cell's `.task` re-firing as it scrolls back into view before the
    /// first fetch finished — so only one network round-trip happens per
    /// request at a time (Phase 4 requirement: "avoid duplicate network
    /// requests").
    private var inFlight: [String: Task<UIImage, Error>] = [:]

    /// `targetSize` in points — nil decodes at the source's native
    /// resolution (used for contexts too varied to have one sensible target,
    /// e.g. a resizable thumbnail palette). When given, the image is
    /// downsampled via ImageIO to `targetSize * scale` during decode, not
    /// decoded at full resolution and scaled down afterward — the actual
    /// lever for "crisp but fast": a grid cell never pays to decode/hold a
    /// multi-megapixel source image it displays at 110pt wide.
    func image(for url: URL, targetSize: CGSize?, scale: CGFloat) async throws -> UIImage {
        let key = cacheKey(url: url, targetSize: targetSize, scale: scale)
        if let cached = cache.object(forKey: key as NSString) {
            return cached
        }
        if let existing = inFlight[key] {
            return try await existing.value
        }

        let task = Task<UIImage, Error> {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = Self.decode(data, targetSize: targetSize, scale: scale) else {
                throw URLError(.cannotDecodeContentData)
            }
            return image
        }
        inFlight[key] = task
        defer { inFlight[key] = nil }

        let image = try await task.value
        cache.setObject(image, forKey: key as NSString, cost: Self.byteCost(of: image))
        return image
    }

    private func cacheKey(url: URL, targetSize: CGSize?, scale: CGFloat) -> String {
        guard let targetSize else { return url.absoluteString }
        return "\(url.absoluteString)@\(Int(targetSize.width * scale))x\(Int(targetSize.height * scale))"
    }

    private static func byteCost(of image: UIImage) -> Int {
        guard let cgImage = image.cgImage else { return 0 }
        return cgImage.bytesPerRow * cgImage.height
    }

    /// ImageIO thumbnail decode — the actual downsampling step. Falls back
    /// to a plain full-resolution `UIImage(data:)` decode when no target
    /// size was requested.
    private static func decode(_ data: Data, targetSize: CGSize?, scale: CGFloat) -> UIImage? {
        guard let targetSize, targetSize.width > 0, targetSize.height > 0 else {
            return UIImage(data: data)
        }
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }

        let maxDimensionInPixels = max(targetSize.width, targetSize.height) * scale
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimensionInPixels,
        ]
        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return UIImage(data: data)
        }
        return UIImage(cgImage: thumbnail, scale: scale, orientation: .up)
    }
}

/// Mirrors `AsyncImagePhase` — distinguishes "no image to load" from
/// "loading" from "failed" so a call site can render a missing-image state
/// differently from an in-flight spinner (Phase 4 requirement §5).
enum CachedImagePhase {
    case empty
    case loading
    case success(Image)
    case failure
}

/// Drop-in replacement for `AsyncImage` backed by `ImageCache` — avoids
/// re-downloading the same card image every time a grid cell scrolls back
/// into view. Used for every catalog/card-detail image; nothing in this app
/// should call `URLSession` for an image directly. Pass `targetSize` in
/// points for anything with a known, fixed on-screen size (a grid cell, a
/// fixed-width rail thumbnail) so the decode is downsampled to match —
/// leave it nil only where the display size genuinely varies per call site.
struct CachedAsyncImage<Content: View>: View {
    private let url: URL?
    private let targetSize: CGSize?
    private let content: (CachedImagePhase) -> Content

    @State private var phase: CachedImagePhase = .empty

    init(url: URL?, targetSize: CGSize? = nil, @ViewBuilder content: @escaping (CachedImagePhase) -> Content) {
        self.url = url
        self.targetSize = targetSize
        self.content = content
    }

    var body: some View {
        content(phase)
            // Keyed on `url` so a recycled cell whose underlying card
            // changes (LazyVGrid reusing identity) restarts the load for
            // the new URL instead of showing the previous card's image.
            .task(id: url) { await load() }
    }

    private func load() async {
        guard let url else {
            phase = .empty
            return
        }
        phase = .loading
        do {
            let uiImage = try await ImageCache.shared.image(for: url, targetSize: targetSize, scale: UIScreen.main.scale)
            if !Task.isCancelled {
                phase = .success(Image(uiImage: uiImage))
            }
        } catch {
            if !Task.isCancelled {
                phase = .failure
            }
        }
    }
}
