import { Skeleton, CardGridSkeleton, StatTilesSkeleton } from "@/components/ui/skeleton";

export default function ShelfLoading() {
  return (
    <div className="min-h-screen bg-background pb-48">
      <div className="pt-32 px-6 md:px-12 max-w-[1600px] mx-auto space-y-8">
        <Skeleton className="h-14 w-64" />

        <StatTilesSkeleton count={6} />

        <Skeleton className="h-9 w-full max-w-md rounded-full" />

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <CardGridSkeleton count={12} />
          </div>
          <div className="w-full lg:w-[320px] shrink-0 space-y-4" aria-busy="true" aria-label="Loading sidebar">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
