import { Skeleton, CardGridSkeleton } from "@/components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-8">
      <Skeleton className="h-10 w-56" />
      <CardGridSkeleton count={12} />
    </div>
  );
}
