import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-48">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-24 md:pt-32 space-y-24">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-16 w-96 max-w-full" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        {Array.from({ length: 3 }).map((_, section) => (
          <section key={section} className="space-y-8">
            <Skeleton className="h-7 w-56" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[63/88] w-full rounded-2xl" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
