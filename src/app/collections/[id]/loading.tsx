import { Skeleton, CardGridSkeleton, StatTilesSkeleton } from "@/components/ui/skeleton";

export default function CollectionDetailLoading() {
  return (
    <div className="min-h-screen w-full pb-32">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-16 md:pt-24 space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-96 max-w-full" />
        </div>
        <StatTilesSkeleton count={3} />
        <CardGridSkeleton count={30} />
      </div>
    </div>
  );
}
