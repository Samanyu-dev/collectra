import { Skeleton, StatTilesSkeleton, ListRowsSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-full sm:w-80 rounded-full" />
        </div>

        {/* Level 1: Metrics */}
        <StatTilesSkeleton count={3} />

        {/* Level 2: Portfolio chart */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>

        {/* Level 3: Insights + Recent Activity / Wishlist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <Skeleton className="h-7 w-56" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-10 w-full rounded-xl mt-4" />
                </div>
              ))}
            </div>
          </section>
          <aside className="space-y-6">
            <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
              <Skeleton className="h-3 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-24 rounded-3xl" />
          </aside>
        </div>

        {/* Level 4.5: Health breakdown + Collection gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
            <Skeleton className="h-3 w-40" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Level 5: Market movers + Franchise breakdown / Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
            <Skeleton className="h-3 w-32" />
            <ListRowsSkeleton count={5} />
          </div>
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-4">
              <Skeleton className="h-3 w-40" />
              <ListRowsSkeleton count={3} />
            </div>
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </div>

        {/* Level 6: Top valuable cards */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-44" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[63/88] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
