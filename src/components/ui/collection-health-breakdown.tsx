import type { HealthFactors } from "@/lib/intelligence/feed/dashboard-data";

export function CollectionHealthBreakdown({ score, factors }: { score: number; factors: HealthFactors }) {
  const rows = [
    { label: "Pricing Coverage", value: factors.pricingCoverage },
    { label: "Metadata Quality", value: factors.metadataQuality },
    { label: "Images", value: factors.imagesCoverage },
    // Shown as the raw "how much is duplicated" number — more legible here
    // than the inverted duplicateHealth factor averaged into the score.
    { label: "Duplicate Ratio", value: 100 - factors.duplicateHealth },
    { label: "Wishlist Coverage", value: factors.wishlistCoverage },
  ];

  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-baseline gap-2 mb-5">
        <span className="text-3xl font-display font-bold text-green-400">{score}</span>
        <span className="text-sm text-foreground/50 font-mono uppercase tracking-widest">Collection Health</span>
      </div>

      <div className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground/60">{r.label}</span>
              <span className="font-mono text-foreground/40">{r.value.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-foreground/8 rounded-full overflow-hidden">
              <div className="h-full bg-green-400/70 rounded-full" style={{ width: `${Math.min(100, Math.max(0, r.value))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
