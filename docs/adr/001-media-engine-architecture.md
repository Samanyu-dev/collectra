# 1. Media Engine Architecture & Polymorphic Graph

Date: 2026-07-16

## Status
Accepted

## Context
As Collectra evolves past its core data graph, media assets (card images, product shots, artist portraits) become the highest-impact visual components. Initially, media was modeled as a simple `Image` table tightly coupled to a `cardId` or `productId` with static URL fields (`thumbnailUrl`, `hqUrl`, etc.).

This approach breaks down at scale because:
1. **Deduplication:** The same artwork used across multiple cards or sets would be downloaded and stored multiple times.
2. **Extensibility:** Adding new formats (AVIF, WebP, Retina, Mobile Crop) required schema migrations.
3. **Usage:** A single image couldn't easily be used as a Homepage Hero banner *and* a Card asset simultaneously without duplicating rows.
4. **Scraping Risks:** Fragile, source-specific scrapers (like `sports-scraper-sync`) create high maintenance burdens and potential ToS risks.

## Decision
We are introducing Phase 15 - Pillar 2 (Media Engine) and formalizing our external ingestion layer.

1. **Monorepo Packages:** We will extract shared logic into `packages/core` (types, generic interfaces) and `packages/media` (downloaders, optimizers, storage adapters).
2. **SourceAdapter Framework:** We will halt direct website scraping and replace it with a generic `SourceAdapter` interface (`packages/core/adapters/SourceAdapter.ts`). All ingestion must pass through this interface, whether from an API, a user upload, or a licensed dataset.
3. **Polymorphic Media Schema:**
   - `Media`: The canonical representation of an asset. Uses `originalHash` for absolute deduplication. Tracks `MediaSource`, `MediaStatus`, and `LicenseType` via strict enums. Contains intelligent metadata (`blurhash`, `palette`, `brightness`). Uses `storageKey` and `provider` instead of raw URLs to decouple from the physical storage bucket.
   - `MediaVariant`: Represents generated permutations of the original asset (e.g., `type: "thumbnail"`, `type: "avif"`, `isWatermarked`).
   - `MediaAttachment`: Represents where the media is used in the graph (`entityType`, `entityId`, `usage`), allowing many-to-many reuse.
4. **Adapter Interfaces:**
   - `StorageAdapter`: Abstracts local disk, S3, R2, etc.
   - `ImageProcessor`: Wraps `sharp` for optimizations, decoupling us from the specific imaging library.

## Consequences
- **Positive:** Massive bandwidth savings via deduplication. UI performance skyrockets using blurhashes and AVIF. The Scanner (future phase) now has a structured foundation for high-res cropping. We avoid fragile scraping code.
- **Negative:** Schema complexity increases. The local database `Image` table must be dropped/migrated to `Media`, requiring a full data resync for local dev environments. Monorepo tooling overhead is introduced.

**2026-08-06 update**: the `StorageAdapter` abstraction proved out — a full storage-provider migration (Supabase → Vercel Blob for public media, ADR 007) required zero interface changes, only a new adapter implementation and a per-row provider check on read. `packages/media` now ships `LocalStorageAdapter`, `SupabaseStorageAdapter`, and `VercelBlobAdapter` behind the same interface.
