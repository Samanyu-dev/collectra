import { Skeleton } from "@/components/ui/skeleton";

export default function MigrationReviewLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 border-b border-foreground/10 flex items-center justify-between px-6 shrink-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 border-r border-foreground/10 p-8 space-y-6">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[63/88] w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
