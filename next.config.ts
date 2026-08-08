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
      // Vercel Blob — catalog/marketplace media landed here after Supabase
      // Storage hit its plan quota; every Blob store gets its own opaque
      // per-store subdomain, so this wildcards rather than hardcoding one
      // store's host.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Appwrite — new default write provider as of 2026-08-07 (Vercel
      // Blob's own free tier became the new constraint). Wildcarded across
      // Appwrite Cloud's region subdomains (nyc, fra, syd, ...), not
      // hardcoded to this project's "nyc" region, same reasoning as Blob
      // above — this exact class of bug (missing remotePatterns entry
      // throwing a Server Components render error) already happened once
      // for Blob, see PROJECT_STATE.md.
      { protocol: 'https', hostname: '*.cloud.appwrite.io' }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
