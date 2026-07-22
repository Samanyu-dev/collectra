import Link from "next/link";
import { Factory } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManufacturersPage() {
  const manufacturers = await prisma.manufacturer.findMany({
    include: {
      brands: {
        include: { _count: { select: { series: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const withBrands = manufacturers.filter((m) => m.brands.length > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight flex items-center gap-3 text-foreground">
          <Factory className="text-primary" /> Manufacturers
        </h1>
        <p className="text-foreground/50 mt-2 max-w-2xl">
          Every card manufacturer and publisher tracked in Collectra, and the brands they've released.
        </p>
      </div>

      {withBrands.length === 0 ? (
        <div className="text-center py-24 text-foreground/40 space-y-2">
          <Factory size={40} className="mx-auto opacity-30" />
          <p>No manufacturer data yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {withBrands.map((m) => {
            const seriesCount = m.brands.reduce((sum, b) => sum + b._count.series, 0);
            return (
              <Link
                key={m.id}
                href={`/manufacturers/${m.id}`}
                className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 hover:border-primary/30 transition-colors"
              >
                <h2 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">{m.name}</h2>
                <p className="text-sm text-foreground/50 mt-2">
                  {m.brands.length} brand{m.brands.length === 1 ? '' : 's'} • {seriesCount} series
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {m.brands.slice(0, 4).map((b) => (
                    <span key={b.id} className="text-[10px] bg-foreground/10 px-2 py-1 rounded text-foreground/70">{b.name}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
