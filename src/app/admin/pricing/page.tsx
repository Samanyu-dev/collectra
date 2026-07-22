import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { AlertTriangle, CheckCircle2, Clock, Database, Gauge, TrendingUp } from "lucide-react";
import { canViewPricingAdmin, timeAgo, timeUntil, rateLimitTone } from "./utils";

export const dynamic = "force-dynamic";

const REFRESH_INTERVAL_HOURS = Number(process.env.PRICE_REFRESH_INTERVAL_HOURS) || 24;
const STALE_THRESHOLD_MS = REFRESH_INTERVAL_HOURS * 2 * 60 * 60 * 1000; // ADR §17: stale = 2x the configured cadence

export default async function PricingAdminPage() {
  const user = await requireUser();
  // Same role-gating pattern as Contribution review (Phase 4) — 404, not a
  // generic error, so an unauthorized visitor doesn't learn this page exists.
  if (!canViewPricingAdmin(user.role)) notFound();

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dataSources, rateLimits, recentErrors, recentJobs, totalObservations, observations24h, currentPrices, staleCurrentPrices] =
    await Promise.all([
      prisma.dataSource.findMany({
        include: { _count: { select: { priceObservations: true } } },
        orderBy: { trustLevel: "desc" },
      }),
      prisma.sourceRateLimit.findMany({ include: { source: { select: { identifier: true } } } }),
      prisma.syncLog.findMany({
        where: { level: "ERROR" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { job: { select: { name: true } } },
      }),
      prisma.syncJob.findMany({
        where: { name: { contains: "price" } },
        orderBy: { lastRunAt: "desc" },
        take: 10,
      }),
      prisma.priceObservation.count(),
      prisma.priceObservation.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.currentPrice.count(),
      prisma.currentPrice.count({
        where: { OR: [{ latestObservationAt: null }, { latestObservationAt: { lt: new Date(Date.now() - STALE_THRESHOLD_MS) } }] },
      }),
    ]);

  const priceSources = dataSources.filter((d) => d._count.priceObservations > 0 || d.identifier.includes("pokemontcg") || d.identifier.includes("cardmarket"));
  const now = Date.now();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 pb-32 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">Pricing Pipeline</h1>
        <p className="text-foreground/50 mt-2">
          Real-time visibility into the price engine (docs/adr/003-price-engine-architecture.md). Refresh cadence:{" "}
          {REFRESH_INTERVAL_HOURS}h · stale threshold: {REFRESH_INTERVAL_HOURS * 2}h.
        </p>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={Database} label="Observations Ingested" value={totalObservations.toLocaleString()} sub={`+${observations24h.toLocaleString()} last 24h`} />
        <StatTile icon={TrendingUp} label="Variants Priced" value={currentPrices.toLocaleString()} sub={`${staleCurrentPrices.toLocaleString()} stale`} />
        <StatTile icon={AlertTriangle} label="Recent Failures" value={recentErrors.length.toString()} sub="last 20 error logs" tone={recentErrors.length > 0 ? "warn" : "ok"} />
        <StatTile
          icon={Gauge}
          label="Rate Limit Windows"
          value={rateLimits.length.toString()}
          sub={rateLimits.some((r) => r.requestCount >= r.maxPerWindow) ? "at limit" : "enforced, healthy"}
          tone={rateLimits.some((r) => r.requestCount >= r.maxPerWindow) ? "warn" : "ok"}
        />
      </div>

      {/* Sources */}
      <section className="bg-foreground/5 border border-foreground/10 rounded-3xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <Database size={18} className="text-primary" /> Price Sources
        </h2>
        {priceSources.length === 0 ? (
          <p className="text-sm text-foreground/50">No price source has synced yet.</p>
        ) : (
          <div className="space-y-2">
            {priceSources.map((s) => {
              const stale = !s.lastSyncedAt || now - s.lastSyncedAt.getTime() > STALE_THRESHOLD_MS;
              return (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-xl bg-foreground/5 border border-foreground/10">
                  <div>
                    <p className="font-medium text-foreground text-sm">{s.name ?? s.identifier}</p>
                    <p className="text-xs text-foreground/40 font-mono mt-0.5">
                      {s.kind} · trust {s.trustLevel} · {s._count.priceObservations.toLocaleString()} observations
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-mono ${stale ? "text-yellow-500" : "text-green-400"}`}>
                    {stale ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                    {timeAgo(s.lastSyncedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent job runs */}
      <section className="bg-foreground/5 border border-foreground/10 rounded-3xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <Clock size={18} className="text-primary" /> Recent Sync Jobs
        </h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-foreground/50">No price-sync jobs have run through the SyncJob queue yet (the cron route calls the sync directly — see ADR §9).</p>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 border border-foreground/10 text-sm">
                <span className="font-mono text-foreground/70">{j.name}</span>
                <span className={`text-xs font-mono ${j.status === "FAILED" ? "text-red-400" : j.status === "COMPLETED" ? "text-green-400" : "text-foreground/50"}`}>
                  {j.status}
                </span>
                <span className="text-xs text-foreground/40">{timeAgo(j.lastRunAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Failures */}
      <section className="bg-foreground/5 border border-foreground/10 rounded-3xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={18} className="text-yellow-500" /> Recent Failures
        </h2>
        {recentErrors.length === 0 ? (
          <p className="text-sm text-foreground/50">No error logs recorded.</p>
        ) : (
          <div className="space-y-2">
            {recentErrors.map((e) => (
              <div key={e.id} className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-red-400 text-xs">{e.job.name}</span>
                  <span className="text-xs text-foreground/40">{timeAgo(e.createdAt)}</span>
                </div>
                <p className="text-foreground/70 mt-1 text-xs">{e.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rate limits — enforced in src/lib/pricing/rate-limit.ts, checked before every outbound request */}
      <section className="bg-foreground/5 border border-foreground/10 rounded-3xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <Gauge size={18} className="text-primary" /> Rate Limits
        </h2>
        {rateLimits.length === 0 ? (
          <p className="text-sm text-foreground/50">No requests made yet — windows are created on first use.</p>
        ) : (
          <div className="space-y-2">
            {rateLimits
              .sort((a, b) => a.windowSeconds - b.windowSeconds)
              .map((r) => {
                const tone = rateLimitTone(r.requestCount, r.maxPerWindow);
                const toneText = tone === "exceeded" ? "text-red-400" : tone === "warn" ? "text-yellow-500" : "text-green-400";
                const toneBar = tone === "exceeded" ? "bg-red-400" : tone === "warn" ? "bg-yellow-500" : "bg-green-400";
                const ratio = r.requestCount / r.maxPerWindow;
                const windowLabel = r.windowSeconds >= 86400 ? `${r.windowSeconds / 86400}d` : r.windowSeconds >= 60 ? `${r.windowSeconds / 60}m` : `${r.windowSeconds}s`;
                const resetAt = new Date(r.windowStartAt.getTime() + r.windowSeconds * 1000);
                return (
                  <div key={r.id} className="p-3 rounded-xl bg-foreground/5 border border-foreground/10 text-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground/70">
                        {r.source.identifier} · per {windowLabel}
                      </span>
                      <span className={`text-xs font-mono ${toneText}`}>
                        {r.requestCount}/{r.maxPerWindow}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                      <div className={`h-full rounded-full ${toneBar}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-foreground/40">resets {timeUntil(resetAt)}</p>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/40 text-[10px] font-mono uppercase tracking-widest mb-2">
        <Icon size={14} /> {label}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className={`text-[11px] mt-1 ${tone === "warn" ? "text-yellow-500" : tone === "ok" ? "text-green-400" : "text-foreground/40"}`}>{sub}</p>
    </div>
  );
}
