import { Skeleton, StatTilesSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-12">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <StatTilesSkeleton count={3} />
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
      </div>
    </div>
  );
}
