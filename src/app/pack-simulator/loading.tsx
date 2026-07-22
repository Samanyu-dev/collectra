import { Skeleton } from "@/components/ui/skeleton";

export default function PackSimulatorLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-40 h-48 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-14 w-48 rounded-full" />
      </div>
    </div>
  );
}
