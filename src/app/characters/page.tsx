import Link from "next/link";
import { Users, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { EntityTile } from "@/components/ui/entity-tile";

export const dynamic = "force-dynamic";

export default async function CharactersPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) || 1 : 1;
  const limit = 40;

  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {};

  const [charactersRaw, total] = await Promise.all([
    prisma.character.findMany({
      where,
      orderBy: { cards: { _count: "desc" } },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { cards: true } }, cards: { take: 1, select: { id: true } } },
    }),
    prisma.character.count({ where }),
  ]);

  const previewImages = await getImagesForEntities("Card", charactersRaw.flatMap((c) => c.cards.map((card) => card.id)));
  const characters = charactersRaw.map((c) => ({
    ...c,
    previewImage: c.cards[0] ? previewImages.get(c.cards[0].id)?.[0]?.url ?? null : null,
  }));

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-8">
      <div>
        <p className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-2">
          <Users size={16} /> Characters
        </p>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Every character in the graph
        </h1>
        <p className="text-foreground/50 mt-2 max-w-2xl">{total.toLocaleString()} characters tracked, ranked by card appearances.</p>
      </div>

      <form action="/characters" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          aria-label="Search characters"
          placeholder="Search character name..."
          className="w-full bg-foreground/5 border border-foreground/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </form>

      {characters.length === 0 ? (
        <div className="text-center py-24 text-foreground/40">No characters found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {characters.map((character) => (
            <EntityTile
              key={character.id}
              href={`/characters/${character.id}`}
              name={character.name}
              meta={`${character._count.cards} Appearance${character._count.cards === 1 ? '' : 's'}`}
              imageUrl={character.previewImage}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-8">
          {page > 1 && (
            <Link href={`/characters?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-foreground/50 font-mono">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/characters?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
