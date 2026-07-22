import Link from "next/link";
import { notFound } from "next/navigation";
import { Factory, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManufacturerDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id },
    include: {
      brands: {
        include: {
          series: {
            include: {
              franchise: true,
              _count: { select: { sets: true } },
            },
          },
        },
      },
    },
  });

  if (!manufacturer) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-10">
      <Link href="/manufacturers" className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> All Manufacturers
      </Link>

      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight flex items-center gap-3 text-foreground">
          <Factory className="text-primary" /> {manufacturer.name}
        </h1>
      </div>

      {manufacturer.brands.length === 0 ? (
        <div className="text-center py-24 text-foreground/40 space-y-2">
          <p>No brands tracked for {manufacturer.name} yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {manufacturer.brands.map((brand) => (
            <section key={brand.id} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-display font-bold text-foreground">{brand.name}</h2>
                <div className="h-px bg-foreground/10 flex-1" />
              </div>
              {brand.series.length === 0 ? (
                <p className="text-sm text-foreground/40">No series tracked for this brand yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brand.series.map((s) => (
                    <Link
                      key={s.id}
                      href={`/collections?franchise=${s.franchiseId}`}
                      className="p-5 rounded-xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 hover:border-primary/30 transition-colors"
                    >
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-foreground/50 mt-1">{s.franchise.name} • {s._count.sets} set{s._count.sets === 1 ? '' : 's'}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
