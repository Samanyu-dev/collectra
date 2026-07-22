import { Skeleton, CardGridSkeleton } from "@/components/ui/skeleton";

export default function ShelfLoading() {
  return (
    <div className="min-h-screen bg-background pb-48">
      <div className="pt-32 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-3">
            <Skeleton className="h-14 w-64" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-20 w-48 rounded-2xl" />
        </div>
        <CardGridSkeleton count={12} />
      </div>
    </div>
  );
}
