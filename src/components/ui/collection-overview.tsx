import { StatCard } from "./collectra-ui";
import type { CollectionWorkspace } from "@/lib/collection/workspace";

/** Top stat strip. 7d portfolio change rides on the Value tile's built-in `change` badge rather than a redundant 7th tile. */
export function CollectionOverview({ overview }: { overview: CollectionWorkspace["overview"] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="Collection Value"
        value={Math.round(overview.portfolioValue)}
        prefix="$"
        change={overview.portfolioChange7dPercent != null ? Math.round(overview.portfolioChange7dPercent) : undefined}
        delay={0}
      />
      <StatCard label="Cards Owned" value={overview.totalCards} delay={1} />
      <StatCard label="Unique Cards" value={overview.uniqueCards} delay={2} />
      <StatCard label="Spares" value={overview.spareCount} delay={3} />
      <StatCard label="Completion" value={overview.completionScore} suffix="%" delay={4} />
      <StatCard label="Avg Card Value" value={Math.round(overview.avgCardValue)} prefix="$" delay={5} />
    </div>
  );
}
