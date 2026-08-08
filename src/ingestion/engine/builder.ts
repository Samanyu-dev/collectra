import { prisma } from "./prisma";

/**
 * The Knowledge Graph Builder
 *
 * Provides idempotent UPSERT operations for the Universal Taxonomy.
 * This ensures that no matter what data source we are ingesting,
 * we map it properly into the graph without creating duplicates.
 */

const isUniqueConstraintError = (e: any) => e?.code === "P2002";

/**
 * Runs an upsert-by-unique-field operation, retrying once via `refetch` if
 * two concurrent callers race to create the same row. Postgres's `INSERT ...
 * ON CONFLICT DO UPDATE` (what Prisma's upsert compiles to) is not fully
 * immune to this under real concurrency — two upserts for a row that doesn't
 * exist yet can both attempt the INSERT branch and one loses with a unique
 * constraint violation. Batch/parallel ingestion (see pokemon fetch-all.ts)
 * makes this a real, reproducible case, not a hypothetical.
 */
async function upsertSafe<T>(upsert: () => Promise<T>, refetch: () => Promise<T | null>): Promise<T> {
  try {
    return await upsert();
  } catch (e: any) {
    if (!isUniqueConstraintError(e)) throw e;
    const existing = await refetch();
    if (!existing) throw e; // genuinely gone missing, not just a race — surface the original error
    return existing;
  }
}

export class GraphBuilder {
  // Caches for in-memory deduplication during heavy batch runs
  private universeCache = new Map<string, string>();
  private manufacturerCache = new Map<string, string>();
  private franchiseCache = new Map<string, string>();
  private brandCache = new Map<string, string>();
  private seriesCache = new Map<string, string>();
  private teamCache = new Map<string, string>();
  private artistCache = new Map<string, string>();
  private characterCache = new Map<string, string>();
  private printingCache = new Map<string, string>();
  private parallelCache = new Map<string, string>();
  private personCache = new Map<string, string>();
  private insertCache = new Map<string, string>();

  async getOrCreateUniverse(name: string): Promise<string> {
    if (this.universeCache.has(name)) return this.universeCache.get(name)!;
    const res = await upsertSafe(
      () => prisma.universe.upsert({ where: { name }, update: {}, create: { name } }),
      () => prisma.universe.findUnique({ where: { name } })
    );
    this.universeCache.set(name, res.id);
    return res.id;
  }

  async getOrCreateManufacturer(name: string): Promise<string> {
    if (this.manufacturerCache.has(name)) return this.manufacturerCache.get(name)!;
    const res = await upsertSafe(
      () => prisma.manufacturer.upsert({ where: { name }, update: {}, create: { name } }),
      () => prisma.manufacturer.findUnique({ where: { name } })
    );
    this.manufacturerCache.set(name, res.id);
    return res.id;
  }

  async getOrCreateFranchise(name: string, universeId: string): Promise<string> {
    const key = `${name}-${universeId}`;
    if (this.franchiseCache.has(key)) return this.franchiseCache.get(key)!;
    const res = await upsertSafe(
      () => prisma.franchise.upsert({ where: { name }, update: {}, create: { name, universeId } }),
      () => prisma.franchise.findUnique({ where: { name } })
    );
    this.franchiseCache.set(key, res.id);
    return res.id;
  }

  async getOrCreateBrand(name: string, manufacturerId: string): Promise<string> {
    const key = `${name}-${manufacturerId}`;
    if (this.brandCache.has(key)) return this.brandCache.get(key)!;

    // No unique constraint on Brand name alone, so findFirst-then-create is
    // the only option here — still racy under concurrency, but Brand isn't
    // hit concurrently by any current ingestion path (only per-set setup).
    let brand = await prisma.brand.findFirst({ where: { name, manufacturerId } });
    if (!brand) {
      try {
        brand = await prisma.brand.create({ data: { name, manufacturerId } });
      } catch (e: any) {
        if (!isUniqueConstraintError(e)) throw e;
        brand = await prisma.brand.findFirst({ where: { name, manufacturerId } });
        if (!brand) throw e;
      }
    }
    this.brandCache.set(key, brand.id);
    return brand.id;
  }

  async getOrCreateSeries(name: string, franchiseId: string, brandId: string): Promise<string> {
    const key = `${name}-${franchiseId}-${brandId}`;
    if (this.seriesCache.has(key)) return this.seriesCache.get(key)!;

    let series = await prisma.series.findFirst({ where: { name, franchiseId, brandId } });
    if (!series) {
      try {
        series = await prisma.series.create({ data: { name, franchiseId, brandId } });
      } catch (e: any) {
        if (!isUniqueConstraintError(e)) throw e;
        series = await prisma.series.findFirst({ where: { name, franchiseId, brandId } });
        if (!series) throw e;
      }
    }
    this.seriesCache.set(key, series.id);
    return series.id;
  }

  async getOrCreateSet(data: { id: string, name: string, seriesId: string, releaseDate?: Date, releaseCountry?: string, printedTotal?: number }) {
    const set = await prisma.set.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        seriesId: data.seriesId,
        printedTotal: data.printedTotal,
      },
      create: {
        id: data.id,
        name: data.name,
        seriesId: data.seriesId,
        printedTotal: data.printedTotal,
      }
    });

    if (data.releaseDate || data.releaseCountry) {
      // Check if release exists
      const existingRelease = await prisma.release.findFirst({
        where: { setId: set.id, date: data.releaseDate, country: data.releaseCountry }
      });
      if (!existingRelease) {
        await prisma.release.create({
          data: {
            setId: set.id,
            date: data.releaseDate,
            country: data.releaseCountry,
          }
        });
      }
    }

    return set;
  }

  async getOrCreatePrinting(name: string): Promise<string> {
    if (this.printingCache.has(name)) return this.printingCache.get(name)!;
    const res = await upsertSafe(
      () => prisma.printing.upsert({ where: { name }, update: {}, create: { name } }),
      () => prisma.printing.findUnique({ where: { name } })
    );
    this.printingCache.set(name, res.id);
    return res.id;
  }

  /**
   * `name` must already be the display-unique string (e.g. "Mini Diamond -
   * Gold", "Pink Rainbow Foil") since Parallel.name is a single global
   * namespace — `finish`/`color` are the decomposed, queryable axes stored
   * alongside it (see schema.prisma's Parallel doc comment for why a
   * combined name still exists even though the two axes are separated).
   */
  async getOrCreateParallel(name: string, opts?: { finish?: string; color?: string }): Promise<string> {
    if (this.parallelCache.has(name)) return this.parallelCache.get(name)!;
    const res = await upsertSafe(
      () =>
        prisma.parallel.upsert({
          where: { name },
          update: { finish: opts?.finish, color: opts?.color },
          create: { name, finish: opts?.finish, color: opts?.color },
        }),
      () => prisma.parallel.findUnique({ where: { name } })
    );
    this.parallelCache.set(name, res.id);
    return res.id;
  }

  async getOrCreateArtist(name: string): Promise<string> {
    if (this.artistCache.has(name)) return this.artistCache.get(name)!;
    const res = await upsertSafe(
      () => prisma.artist.upsert({ where: { name }, update: {}, create: { name } }),
      () => prisma.artist.findUnique({ where: { name } })
    );
    this.artistCache.set(name, res.id);
    return res.id;
  }

  async getOrCreateCharacter(name: string): Promise<string> {
    if (this.characterCache.has(name)) return this.characterCache.get(name)!;
    const res = await upsertSafe(
      () => prisma.character.upsert({ where: { name }, update: {}, create: { name } }),
      () => prisma.character.findUnique({ where: { name } })
    );
    this.characterCache.set(name, res.id);
    return res.id;
  }

  async getOrCreateTeam(name: string, opts?: { type?: "CLUB" | "NATIONAL"; country?: string }): Promise<string> {
    if (this.teamCache.has(name)) return this.teamCache.get(name)!;
    const res = await upsertSafe(
      () =>
        prisma.team.upsert({
          where: { name },
          update: {},
          create: { name, type: opts?.type ?? "CLUB", country: opts?.country },
        }),
      () => prisma.team.findUnique({ where: { name } })
    );
    this.teamCache.set(name, res.id);
    return res.id;
  }

  /** Football database foundation — players as real linked entities (Person + Card.persons), not just free-text Card.name strings. */
  async getOrCreatePerson(name: string): Promise<string> {
    if (this.personCache.has(name)) return this.personCache.get(name)!;
    const res = await upsertSafe(
      () => prisma.person.upsert({ where: { name }, update: {}, create: { name } }),
      () => prisma.person.findUnique({ where: { name } })
    );
    this.personCache.set(name, res.id);
    return res.id;
  }

  /** Separates true insert/subset categories from color/foil Parallels — see the Insert model's doc comment in schema.prisma. */
  async getOrCreateInsert(name: string, setId: string, description?: string): Promise<string> {
    const key = `${name}-${setId}`;
    if (this.insertCache.has(key)) return this.insertCache.get(key)!;
    let insert = await prisma.insert.findFirst({ where: { name, setId } });
    if (!insert) {
      try {
        insert = await prisma.insert.create({ data: { name, setId, description } });
      } catch (e: any) {
        if (!isUniqueConstraintError(e)) throw e;
        insert = await prisma.insert.findFirst({ where: { name, setId } });
        if (!insert) throw e;
      }
    }
    this.insertCache.set(key, insert.id);
    return insert.id;
  }

  /**
   * A sealed-product SKU (e.g. "Topps Premier League 2025/26 Hobby Box") —
   * the root of the Product/ProductComponent/Pack/PossiblePull odds graph
   * (see `src/app/products/[id]/page.tsx` and `pack-simulator`, both already
   * built against this graph but unpopulated for any set until now). Not
   * cached in-memory since it's created once per SKU per seed run, not
   * looked up per-card in a hot loop like the other helpers here.
   */
  async getOrCreateProduct(name: string, setId?: string, msrpUsd?: number): Promise<string> {
    let product = await prisma.product.findFirst({ where: { name, setId } });
    if (!product) {
      try {
        product = await prisma.product.create({ data: { name, setId, msrpUsd } });
      } catch (e: any) {
        if (!isUniqueConstraintError(e)) throw e;
        product = await prisma.product.findFirst({ where: { name, setId } });
        if (!product) throw e;
      }
    } else if (msrpUsd != null && product.msrpUsd == null) {
      product = await prisma.product.update({ where: { id: product.id }, data: { msrpUsd } });
    }
    return product.id;
  }

  /** A pack type within a product (e.g. "Hobby Pack", "Retail Pack") — PossiblePull rows hang off this. */
  async getOrCreatePack(name: string): Promise<string> {
    let pack = await prisma.pack.findFirst({ where: { name } });
    if (!pack) {
      try {
        pack = await prisma.pack.create({ data: { name } });
      } catch (e: any) {
        if (!isUniqueConstraintError(e)) throw e;
        pack = await prisma.pack.findFirst({ where: { name } });
        if (!pack) throw e;
      }
    }
    return pack.id;
  }

  /**
   * A citation for a documented fact (odds, weight, etc.) — `sourceType` is
   * one of OFFICIAL/COMMUNITY/ESTIMATED/RESEARCH per the schema's existing
   * convention (see Evidence in schema.prisma), so every odds figure this
   * project writes can be filtered/audited by how trustworthy its source is.
   */
  async getOrCreateEvidence(sourceType: string, sourceUrl?: string, verified = false): Promise<string> {
    let evidence = await prisma.evidence.findFirst({ where: { sourceType, sourceUrl } });
    if (!evidence) {
      evidence = await prisma.evidence.create({ data: { sourceType, sourceUrl, verified } });
    }
    return evidence.id;
  }
}

export const builder = new GraphBuilder();
