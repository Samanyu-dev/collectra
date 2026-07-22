export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`relative overflow-hidden rounded-lg bg-foreground/[0.06] ${className}`}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

/** A grid of card-shaped skeletons — matches the aspect-[63/88] card grids used across the app. */
export function CardGridSkeleton({ count = 18, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`} aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[63/88] w-full rounded-xl" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** A row of stat-tile skeletons — matches the metric cards on statistics/home. */
export function StatTilesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A vertical list of row skeletons — matches search results, recent-imports, etc. */
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
          <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
