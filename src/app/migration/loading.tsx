import { Skeleton, ListRowsSkeleton } from "@/components/ui/skeleton";

export default function MigrationLoading() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <section className="w-full py-24 border-b border-foreground/10 bg-elevated flex flex-col items-center gap-4">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-14 w-96 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </section>
      <div className="max-w-[1200px] mx-auto px-6 mt-16 space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
        <Skeleton className="w-full aspect-[6/1] rounded-3xl" />
        <ListRowsSkeleton count={4} />
      </div>
    </div>
  );
}
