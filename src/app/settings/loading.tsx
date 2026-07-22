import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 pb-32 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-foreground/5 border border-foreground/10 rounded-3xl p-8 space-y-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
