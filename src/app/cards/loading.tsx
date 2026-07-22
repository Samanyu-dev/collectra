import { Skeleton, CardGridSkeleton } from "@/components/ui/skeleton";

export default function CardsLoading() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-32 space-y-8">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-12 w-full max-w-md rounded-full" />
      <CardGridSkeleton count={24} />
    </div>
  );
}
