import { SidebarWidget } from "./sidebar-widget";
import { RecentActivityPanel } from "./recent-activity-panel";
import { SetProgressWidget } from "./set-progress-widget";
import { BarBreakdownChart } from "./charts/bar-breakdown-chart";
import { PortfolioChart } from "./portfolio-chart";
import { AnimatedNumber } from "./collectra-ui";
import type { CollectionWorkspace } from "@/lib/collection/workspace";

/**
 * Persistent right-hand sidebar — always visible, no accordion (per review:
 * Tier-1 analytics should never require an extra click to see). The core 4
 * numbers stay pinned via `sticky` while the widgets below scroll
 * independently, Notion-style. Ordered by priority per review: Recent
 * Activity and Set Progress rank above the breakdown charts.
 *
 * Deliberately not building yet, but designed to fit without restructuring:
 * a future `sidebar.aiInsight` widget would slot in as one more
 * `<SidebarWidget>` in this same list.
 */
export function CollectionSidebar({
  overview,
  sidebar,
}: {
  overview: CollectionWorkspace["overview"];
  sidebar: CollectionWorkspace["sidebar"];
}) {
  return (
    <aside className="w-full lg:w-[320px] shrink-0 space-y-4">
      <div className="sticky top-4 z-10 rounded-2xl border border-foreground/10 bg-background/80 backdrop-blur-xl p-4 grid grid-cols-2 gap-3 shadow-lg">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Value</p>
          <AnimatedNumber value={Math.round(overview.portfolioValue)} prefix="$" className="text-lg font-bold" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Completion</p>
          <AnimatedNumber value={overview.completionScore} suffix="%" className="text-lg font-bold" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Cards</p>
          <AnimatedNumber value={overview.totalCards} className="text-lg font-bold" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Spares</p>
          <AnimatedNumber value={overview.spareCount} className="text-lg font-bold" />
        </div>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
        <SidebarWidget title="Recent Activity">
          <RecentActivityPanel entries={sidebar.recentActivity} />
        </SidebarWidget>

        <SidebarWidget title="Set Progress">
          <SetProgressWidget entries={sidebar.setProgress} />
        </SidebarWidget>

        <SidebarWidget title="Top Teams">
          <BarBreakdownChart data={sidebar.topTeams} />
        </SidebarWidget>

        <SidebarWidget title="Top Sets">
          <BarBreakdownChart data={sidebar.topSets} />
        </SidebarWidget>

        <SidebarWidget title="Top Players">
          <BarBreakdownChart data={sidebar.topPlayers} />
        </SidebarWidget>

        <SidebarWidget title="Portfolio">
          {sidebar.portfolio ? (
            <div className="h-32">
              <PortfolioChart data={sidebar.portfolio.history} />
            </div>
          ) : (
            <p className="text-xs text-foreground/40">Not enough purchase-date history yet to chart growth.</p>
          )}
        </SidebarWidget>
      </div>
    </aside>
  );
}
