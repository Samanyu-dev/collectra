import { Skeleton, CardGridSkeleton } from "@/components/ui/skeleton";

export default function ArtistDetailLoading() {
  return (
    <div className="min-h-screen w-full bg-background pb-48">
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-32 space-y-12">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-14 w-96 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <CardGridSkeleton count={12} />
      </main>
    </div>
  );
}
