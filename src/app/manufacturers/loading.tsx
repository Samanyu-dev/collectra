import { Skeleton } from "@/components/ui/skeleton";

export default function ManufacturersLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
