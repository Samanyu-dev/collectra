import Link from "next/link";
import { Compass } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const universes = await prisma.universe.findMany({
    include: {
      franchises: {
        include: {
          series: {
            include: { sets: { select: { id: true } }, brand: true },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-12">
      <div>
        <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold tracking-tight flex items-center gap-3">
          <Compass className="text-primary" /> Explore the Universe
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Browse by universe and franchise, down to individual sets.
        </p>
      </div>

      {universes.map((universe) => {
        const franchisesWithSets = universe.franchises.filter((f) => f.series.some((s) => s.sets.length > 0));
        if (franchisesWithSets.length === 0) return null;

        return (
          <section key={universe.id} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold">{universe.name}</h2>
              <div className="h-px bg-border flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {franchisesWithSets.map((franchise) => {
                const setCount = franchise.series.reduce((sum, s) => sum + s.sets.length, 0);
                return (
                  <Link
                    key={franchise.id}
                    href={`/collections?franchise=${franchise.id}`}
                    className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors"
                  >
                    <div className="h-24 relative overflow-hidden flex items-center justify-center bg-foreground/5">
                      <h3 className="relative z-10 text-2xl font-[family-name:var(--font-display)] font-bold tracking-widest uppercase drop-shadow-md group-hover:text-primary transition-colors">
                        {franchise.name}
                      </h3>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <p className="text-sm text-muted-foreground">{setCount} set{setCount === 1 ? '' : 's'} tracked</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {franchise.series.slice(0, 4).map((s) => (
                          <span key={s.id} className="text-[10px] bg-muted px-2 py-1 rounded">{s.brand.name}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
