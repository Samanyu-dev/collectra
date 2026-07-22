import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client for the ingestion layer (GraphBuilder, media,
 * fetch-all/curator scripts). Two deliberate differences from the client the
 * Next.js app uses:
 *
 * 1. Connects via DIRECT_URL (session-mode Postgres), not the pooled
 *    DATABASE_URL (pgbouncer transaction mode). Pooled/transaction-mode
 *    connections are tuned for many short-lived serverless requests; a batch
 *    script making thousands of sequential queries in one long session is
 *    the opposite access pattern and is Prisma's own documented case for
 *    using the direct connection instead. Falls back to DATABASE_URL if
 *    DIRECT_URL isn't set (e.g. local sqlite dev).
 * 2. Every query automatically retries on transient connection errors with
 *    exponential backoff + jitter, via a client extension — so resilience is
 *    infrastructure every ingestion script gets for free, not something each
 *    script has to remember to wrap calls in.
 */
const ingestionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

const basePrisma = new PrismaClient({
  datasources: { db: { url: ingestionUrl } },
});

const TRANSIENT_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);
const TRANSIENT_MESSAGE_RE = /Can't reach database server|Connection terminated|timed? ?out|ECONNRESET|ETIMEDOUT|Closed/i;

function isTransientDbError(e: any): boolean {
  return TRANSIENT_ERROR_CODES.has(e?.code) || TRANSIENT_MESSAGE_RE.test(e?.message || "");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Generous budget — this is a background batch context, not user-facing
        // (see src/lib/prisma.ts for the app's fail-fast variant). ~10 attempts
        // capped at 30s each gives multi-minute pooler blips room to clear
        // without needing a human to notice and manually resume the script.
        const maxAttempts = 10;
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (e: any) {
            if (!isTransientDbError(e) || attempt >= maxAttempts) throw e;
            const delay = Math.min(1000 * 2 ** (attempt - 1), 30000) + Math.random() * 1000;
            console.warn(
              `[db-retry] ${model ?? ""}.${operation} failed (attempt ${attempt}/${maxAttempts}): ${
                (e.message || "").split("\n")[0]
              }. Retrying in ${(delay / 1000).toFixed(1)}s...`
            );
            await sleep(delay);
          }
        }
      },
    },
  },
});
