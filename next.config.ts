import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pokemontcg.io' },
      { protocol: 'https', hostname: 'images.scrydex.com' },
      // Supabase Storage — where nearly all media (Pokemon official art, eBay
      // listing photos, user uploads, scans) actually lives now, re-hosted by
      // the ingestion/scan pipelines. This was missing, which is why
      // `unoptimized` got bolted onto every single <Image> across the app as
      // a workaround instead: Next's optimizer rejects any remote host not
      // listed here, so nothing was ever being resized/compressed/lazy-loaded.
      { protocol: 'https', hostname: 'fnynunzvwvfgiucemmeo.supabase.co' },
      // Vercel Blob — new catalog/marketplace media lands here now (see
      // packages/media/storage/VercelBlobAdapter.ts); Supabase Storage is at
      // its plan quota. Every Blob store gets its own opaque per-store
      // subdomain, so this wildcards rather than hardcoding one store's host.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
