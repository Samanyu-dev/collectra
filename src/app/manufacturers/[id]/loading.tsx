import { Skeleton } from "@/components/ui/skeleton";

export default function ManufacturerDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-10">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
