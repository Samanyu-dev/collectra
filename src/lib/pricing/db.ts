import type { prisma as appPrisma } from "@/lib/prisma";

// The pricing lib is called from two different contexts that deliberately use
// different Prisma clients (see src/lib/prisma.ts and src/ingestion/engine/prisma.ts's
// own docstrings for why): app Server Actions use the pooled/transaction-mode
// client, long-running ingestion scripts use the direct-connection client.
// Every pricing function accepts an optional client, defaulting to the app
// client — the ingestion side passes its own explicitly.
export type PricingPrismaClient = typeof appPrisma;
