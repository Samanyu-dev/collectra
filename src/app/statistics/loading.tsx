import { Skeleton, StatTilesSkeleton } from "@/components/ui/skeleton";

export default function StatisticsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-10">
      <Skeleton className="h-10 w-56" />
      <StatTilesSkeleton count={4} />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
