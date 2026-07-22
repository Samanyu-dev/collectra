import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen w-full bg-background pb-48">
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-32 space-y-24">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
          <Skeleton className="w-full md:w-1/3 aspect-[4/3] rounded-2xl shrink-0" />
          <div className="flex-1 space-y-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-14 w-full max-w-md" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
