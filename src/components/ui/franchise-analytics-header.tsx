import { BarChart3, Layers } from "lucide-react";
import { PortfolioChart } from "./portfolio-chart";
import type { FranchiseAnalytics } from "@/lib/intelligence/feed/franchise-analytics";

export function FranchiseAnalyticsHeader({ analytics }: { analytics: FranchiseAnalytics }) {
  const tiles = [
    { label: "Completion", value: analytics.completionPercent != null ? `${analytics.completionPercent.toFixed(0)}%` : "—" },
    { label: "Market Value", value: `$${analytics.marketValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` },
    { label: "Avg. Card Price", value: analytics.averageCardPrice != null ? `$${analytics.averageCardPrice.toFixed(2)}` : "—" },
    { label: "Duplicates", value: String(analytics.duplicateCount) },
    { label: "Missing", value: analytics.missingCount != null ? String(analytics.missingCount) : "—" },
  ];

  return (
    <section className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 space-y-6">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest">
        <Layers size={16} /> Collection Analytics · {analytics.franchiseName}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <div key={t.label}>
            <p className="text-[11px] text-foreground/40 uppercase tracking-widest mb-1">{t.label}</p>
            <p className="text-xl font-display font-bold">{t.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 text-foreground/40 text-xs font-mono uppercase tracking-widest mb-3">
          <BarChart3 size={13} /> Collection Growth
        </div>
        {analytics.growthHistory.length < 2 ? (
          <div className="p-8 rounded-2xl border border-foreground/10 border-dashed text-center text-foreground/40 text-sm">
            No pricing history yet for this franchise.
          </div>
        ) : (
          <div className="h-56">
            <PortfolioChart data={analytics.growthHistory} />
          </div>
        )}
      </div>
    </section>
  );
}
