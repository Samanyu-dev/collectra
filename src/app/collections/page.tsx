import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getFranchiseAnalytics } from "@/lib/intelligence/feed/franchise-analytics";
import { FranchiseAnalyticsHeader } from "@/components/ui/franchise-analytics-header";
import { getSetProgressForUser } from "@/lib/collection/set-progress";
import { getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";

export const dynamic = "force-dynamic";

export default async function CollectionsIndexPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  
  const selectedFranchise = typeof searchParams.franchise === 'string' ? searchParams.franchise : null;
  const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : null;
  
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const limit = 40; // Sets per page

  // Fetch all franchises for the filter bar
  const franchises = await prisma.franchise.findMany({
    orderBy: { name: 'asc' },
    include: {
      series: {
        include: {
          _count: {
            select: { sets: true }
          }
        }
      }
    }
  });

  // This page is public/auth-optional — per-set owned progress and the
  // Collection Analytics header both need a user, but only when logged in.
  const currentUser = await getCurrentUser();
  const franchiseAnalytics = currentUser && selectedFranchise ? await getFranchiseAnalytics(currentUser.id, selectedFranchise) : null;

  // Determine which sets to fetch
  const whereClause: any = {};
  if (selectedFranchise) {
    whereClause.series = {
      franchiseId: selectedFranchise
    };
  }
  if (searchQuery) {
    whereClause.name = { contains: searchQuery };
  }

  // Fetch paginated sets
  const [sets, totalSets] = await Promise.all([
    prisma.set.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        series: {
          include: {
            franchise: true,
            brand: true
          }
        },
        releases: { orderBy: { date: 'asc' }, take: 1, select: { date: true } },
        _count: { select: { cards: true } },
      }
    }),
    prisma.set.count({
      where: whereClause
    })
  ]);

  const totalPages = Math.ceil(totalSets / limit);
  const setIds = sets.map((s) => s.id);
  const imagesBySet = await getImagesForEntities("Set", setIds);

  // Per-set owned progress + value, for this page of sets only.
  const progressBySet = currentUser ? await getSetProgressForUser(currentUser.id, setIds) : new Map();

  return (
    <div className="min-h-screen w-full pb-32">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-16 md:pt-24 space-y-12">
        
        {/* Header */}
        <section className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground tracking-tight">
            Universes
          </h1>
          <p className="text-xl text-foreground/50 max-w-2xl">
            Explore {totalSets.toLocaleString()} sets across the Universal Knowledge Graph.
          </p>
        </section>

        {franchiseAnalytics && <FranchiseAnalyticsHeader analytics={franchiseAnalytics} />}

        {/* Filter Bar & Search */}
        <section className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-4 border-y border-foreground/5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center -mx-6 md:-mx-12 px-6 md:px-12">
          
          {/* Franchise Tabs (Scrollable) */}
          <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-2 md:pb-0 scrollbar-none">
            <Link 
              href="/collections" 
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${!selectedFranchise ? 'bg-primary text-primary-foreground' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground'}`}
            >
              All Franchises
            </Link>
            {franchises.map(f => {
              const totalSetsInFranchise = f.series.reduce((sum, s) => sum + s._count.sets, 0);
              return (
                <Link 
                  key={f.id}
                  href={`/collections?franchise=${f.id}`}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${selectedFranchise === f.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground'}`}
                >
                  {f.name} ({totalSetsInFranchise})
                </Link>
              );
            })}
          </div>

          {/* Quick Search for Set */}
          <form className="relative w-full md:w-64 shrink-0" action="/collections" method="GET">
            {selectedFranchise && <input type="hidden" name="franchise" value={selectedFranchise} />}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input 
              type="text" 
              name="q"
              defaultValue={searchQuery || ''}
              aria-label="Search sets" placeholder="Search sets..." 
              className="w-full bg-foreground/5 border border-foreground/10 rounded-full pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </form>

        </section>

        {/* Sets Grid */}
        <section>
          {sets.length === 0 ? (
            <div className="py-32 text-center text-foreground/50 text-xl font-display">
              No sets found.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {sets.map(set => {
                const image = pickPrimaryImage(imagesBySet.get(set.id) ?? []);
                const releaseDate = set.releases[0]?.date ?? null;
                const isUpcoming = releaseDate != null && releaseDate.getTime() > Date.now();
                const total = set.printedTotal || set._count.cards || 0;
                const progress = currentUser ? progressBySet.get(set.id) ?? { ownedCount: 0, totalValueUsd: 0 } : null;
                const percentOwned = progress && total > 0 ? Math.round((progress.ownedCount / total) * 100) : 0;
                return (
                <Link
                  key={set.id}
                  href={`/collections/${set.id}`}
                  className={`group flex flex-col gap-3 ${isUpcoming ? 'opacity-50 hover:opacity-80' : ''} transition-opacity`}
                >
                  <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-foreground/5 border border-foreground/10 group-hover:border-foreground/20 transition-colors shadow-lg group-hover:shadow-xl flex items-center justify-center p-6">
                    {image ? (
                      <Image src={image.url} alt={set.name} fill className="object-contain p-6" sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 16vw" />
                    ) : (
                      <div className="text-foreground/20 font-display text-4xl font-bold uppercase tracking-widest text-center">
                        {set.series.franchise.name.substring(0,3)}
                      </div>
                    )}
                    {releaseDate && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-mono text-foreground/60">
                        {releaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {progress && percentOwned > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-background/60">
                        <div className="h-full bg-primary" style={{ width: `${percentOwned}%` }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-foreground font-medium truncate group-hover:text-primary transition-colors" title={set.name}>{set.name}</h3>
                    {progress ? (
                      <div className="flex items-center gap-2 text-xs text-foreground/40 font-mono mt-1">
                        <span>{progress.ownedCount} / {total} owned</span>
                        <span>•</span>
                        <span>${progress.totalValueUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-foreground/40 font-mono mt-1">
                        <span className="truncate">{set.series.name}</span>
                        <span>•</span>
                        <span>{total} Cards</span>
                      </div>
                    )}
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <section className="flex justify-center items-center gap-4 py-12 border-t border-foreground/5">
            {page > 1 && (
              <Link 
                href={`/collections?page=${page - 1}${selectedFranchise ? `&franchise=${selectedFranchise}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                className="px-6 py-3 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium transition-colors"
              >
                Previous
              </Link>
            )}
            
            <div className="text-foreground/50 font-mono text-sm">
              Page {page} of {totalPages}
            </div>

            {page < totalPages && (
              <Link 
                href={`/collections?page=${page + 1}${selectedFranchise ? `&franchise=${selectedFranchise}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                className="px-6 py-3 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium transition-colors"
              >
                Next
              </Link>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
