import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-6">
        <p className="text-8xl font-display font-bold tracking-tighter text-foreground/10 select-none">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">This card isn't in the binder</h1>
          <p className="text-foreground/50">
            The page you're looking for doesn't exist, or may have moved. Try searching, or head back home.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 hover:scale-105 transition-all"
          >
            <Home size={16} /> Go Home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground/10 border border-foreground/20 text-foreground font-medium text-sm hover:bg-foreground/20 transition-colors"
          >
            <Search size={16} /> Search
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground/10 border border-foreground/20 text-foreground font-medium text-sm hover:bg-foreground/20 transition-colors"
          >
            <Compass size={16} /> Explore
          </Link>
        </div>
      </div>
    </div>
  );
}
