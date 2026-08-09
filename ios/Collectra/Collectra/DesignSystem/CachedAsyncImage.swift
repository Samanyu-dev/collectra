import SwiftUI
import UIKit

/// Process-wide in-memory image cache keyed by absolute URL string. Backed by
/// `NSCache` (auto-evicts under memory pressure) — deliberately not a
/// third-party dependency (this app has none besides Supabase); `URLSession`'s
/// own `URLCache` still gives disk-level caching underneath for free.
actor ImageCache {
    static let shared = ImageCache()

    private let cache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 300
        return cache
    }()

    /// Dedupes concurrent requests for the same URL — e.g. a card cell's
    /// `.task` re-firing as it scrolls back into view before the first fetch
    /// finished — so only one network round-trip happens per URL at a time
    /// (Phase 4 requirement: "avoid duplicate network requests").
    private var inFlight: [URL: Task<UIImage, Error>] = [:]

    func image(for url: URL) async throws -> UIImage {
        if let cached = cache.object(forKey: url.absoluteString as NSString) {
            return cached
        }
        if let existing = inFlight[url] {
            return try await existing.value
        }

        let task = Task<UIImage, Error> {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = UIImage(data: data) else {
                throw URLError(.cannotDecodeContentData)
            }
            return image
        }
        inFlight[url] = task
        defer { inFlight[url] = nil }

        let image = try await task.value
        cache.setObject(image, forKey: url.absoluteString as NSString)
        return image
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
/// should call `URLSession` for an image directly.
struct CachedAsyncImage<Content: View>: View {
    private let url: URL?
    private let content: (CachedImagePhase) -> Content

    @State private var phase: CachedImagePhase = .empty

    init(url: URL?, @ViewBuilder content: @escaping (CachedImagePhase) -> Content) {
        self.url = url
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
            let uiImage = try await ImageCache.shared.image(for: url)
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
