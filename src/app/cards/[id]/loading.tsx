import { Skeleton } from "@/components/ui/skeleton";

export default function CardDetailLoading() {
  return (
    <div className="min-h-screen w-full bg-background pb-48">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-24">
          <Skeleton className="w-64 md:w-80 aspect-[63/88] rounded-2xl shrink-0" />
          <div className="flex-1 space-y-6 w-full mt-8 lg:mt-16">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-16 w-full max-w-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-16 w-56 mt-6" />
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-24 aspect-[63/88] rounded-xl shrink-0" />
        ))}
      </div>
    </div>
  );
}
