import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client for the Next.js app (server components, route
 * handlers). Uses the pooled DATABASE_URL (pgbouncer transaction mode) —
 * correct for many short-lived serverless requests, as opposed to
 * src/ingestion/engine/prisma.ts which uses the direct connection for
 * long-running batch scripts.
 *
 * A single shared instance also avoids the classic Next.js dev-mode problem
 * of every hot-reloaded module creating a fresh client and exhausting the
 * pooler's connection slots.
 *
 * Every query auto-retries on transient connection errors (exponential
 * backoff + jitter) — the same resilience the ingestion client has, since
 * app pages hit the identical pooler and are just as exposed to transient
 * blips.
 */
const globalForPrisma = globalThis as unknown as { basePrisma?: PrismaClient };

const basePrisma = globalForPrisma.basePrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.basePrisma = basePrisma;

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
        const maxAttempts = 4; // app requests are user-facing — fail faster than the batch ingestion client
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (e: any) {
            if (!isTransientDbError(e) || attempt >= maxAttempts) throw e;
            const delay = Math.min(500 * 2 ** (attempt - 1), 4000) + Math.random() * 300;
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
