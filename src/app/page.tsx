import { getIntelligenceFeed } from '@/lib/intelligence/feed/service';
import { getDashboardExtended } from '@/lib/intelligence/feed/dashboard-extended';
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { timeAgo } from "@/lib/time-ago";
import {
  TrendingUp, Activity, CheckCircle, ArrowRight, ShieldAlert, BadgeCent,
  Plus, Minus, Star, Shield, Heart, Upload, History, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { PortfolioChart } from '@/components/ui/portfolio-chart';
import { MarketMoversSection } from '@/components/ui/market-movers';
import { FranchiseBreakdownSection } from '@/components/ui/franchise-breakdown';

export const dynamic = 'force-dynamic';

const EVENT_META: Record<string, { label: string; icon: any }> = {
  CARD_ADDED: { label: 'Added', icon: Plus },
  CARD_REMOVED: { label: 'Removed', icon: Minus },
  FAVORITED: { label: 'Favorited', icon: Star },
  UNFAVORITED: { label: 'Unfavorited', icon: Star },
  VAULTED: { label: 'Vaulted', icon: Shield },
  UNVAULTED: { label: 'Unvaulted', icon: Shield },
  WISHLIST_ADDED: { label: 'Wishlisted', icon: Heart },
  WISHLIST_REMOVED: { label: 'Un-wishlisted', icon: Heart },
  IMPORT_COMPLETED: { label: 'Imported', icon: Upload },
};

export default function IntelligenceOSHome() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      {/* We use a React Server Component to fetch the feed data async */}
      <IntelligenceFeed />
    </div>
  );
}

async function IntelligenceFeed() {
  const user = await requireUser();

  const [{ metrics, insights }, extended, recentEvents, wishlistCount] = await Promise.all([
    getIntelligenceFeed(user.id),
    getDashboardExtended(user.id),
    prisma.event.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: 6,
      include: { instance: { include: { variant: { include: { card: true } } } } },
    }),
    prisma.wishlist.count({ where: { userId: user.id } }),
  ]);

  const { portfolioHistory, portfolioChange7dPercent, marketMovers, franchiseBreakdown } = extended;

  return (
    <div className="max-w-[1400px] mx-auto space-y-12">

      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1>
        <p className="text-foreground/50 mt-1">Your collection, at a glance.</p>
      </div>

      {/* Level 1: Metrics Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
            <TrendingUp size={16} /> Portfolio Value
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            ${metrics.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h1>
          {portfolioChange7dPercent != null && (
            <span className={`text-sm font-mono mt-2 ${portfolioChange7dPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {portfolioChange7dPercent >= 0 ? '↑' : '↓'} {Math.abs(portfolioChange7dPercent).toFixed(1)}% (7d)
            </span>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
            <Activity size={16} /> Collection Health
          </div>
          <div className="flex items-end gap-2">
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-green-400">{metrics.healthScore}</h1>
            <span className="text-foreground/40 pb-2">/ 100</span>
          </div>
          <div className="mt-4 w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: `${metrics.healthScore}%` }} />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
            <CheckCircle size={16} /> Completion DNA
          </div>
          <div className="flex items-end gap-2">
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-blue-400">{metrics.completionScore}</h1>
            <span className="text-foreground/40 pb-2">/ 100</span>
          </div>
          <div className="mt-4 w-full h-2 bg-foreground/10 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-400" style={{ width: `${metrics.completionScore}%` }} />
          </div>
        </div>
      </section>

      <div className="flex justify-end -mt-6">
        <Link href="/statistics" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
          View full statistics <ArrowRight size={14} />
        </Link>
      </div>

      {/* Level 2: Portfolio Chart — Full Width */}
      <section>
        <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
          <BarChart3 size={16} /> Portfolio Over Time
        </div>
        {portfolioHistory.length < 2 ? (
          <div className="p-12 rounded-3xl border border-foreground/10 border-dashed text-center text-foreground/40">
            {portfolioHistory.length === 0
              ? 'Add purchase dates to your cards to see your portfolio grow over time.'
              : 'Not enough data points yet — add a few more purchases to see the trend.'}
          </div>
        ) : (
          <div className="h-64 rounded-3xl bg-foreground/5 border border-foreground/10 p-6">
            <PortfolioChart data={portfolioHistory} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Level 3: The Intelligence Stream (Insights) */}
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-display font-medium mb-6">Actionable Insights</h2>

          {insights.length === 0 ? (
            <div className="p-12 rounded-3xl border border-foreground/10 border-dashed text-center text-foreground/40">
              No active insights. Your collection is perfectly optimized.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {insights.map(insight => {
                const payload = JSON.parse(insight.payload);

                return (
                  <div key={insight.id} className="relative p-6 rounded-3xl bg-foreground/5 border border-foreground/10 flex flex-col group hover:bg-foreground/10 transition-colors">
                    <div className="absolute top-6 right-6">
                      {insight.severity === 'WARNING' && <ShieldAlert size={20} className="text-yellow-500" />}
                      {insight.severity === 'INFO' && <BadgeCent size={20} className="text-blue-400" />}
                    </div>

                    <div className="mt-2 mb-4">
                      <span className="text-xs font-mono text-foreground/40 uppercase tracking-widest">{insight.type.replace('_', ' ')}</span>
                    </div>

                    {insight.type === 'SELL_DUPLICATE' && (
                      <>
                        <h3 className="text-2xl font-display font-bold mb-2">Sell Duplicates</h3>
                        <p className="text-foreground/60 mb-6 flex-1">
                          You have {payload.duplicateCount} duplicate cards.
                          {payload.estimatedRecoveryValue != null && (
                            <> Selling them could free up <strong className="text-foreground">${Math.round(payload.estimatedRecoveryValue).toLocaleString()}</strong> for new purchases.</>
                          )}
                        </p>
                      </>
                    )}

                    {insight.type === 'SET_COMPLETION' && (
                      <>
                        <h3 className="text-2xl font-display font-bold mb-2">Finish {payload.projectName}</h3>
                        <p className="text-foreground/60 mb-6 flex-1">
                          You only need {payload.cardsRemaining} more cards to complete this set.
                          {payload.estimatedCost != null && (
                            <> Estimated cost to finish is <strong className="text-foreground">${Math.round(payload.estimatedCost).toLocaleString()}</strong>.</>
                          )}
                        </p>
                      </>
                    )}

                    <Link
                      href={insight.type === 'SELL_DUPLICATE' ? '/shelf' : insight.type === 'SET_COMPLETION' ? '/projects' : '/statistics'}
                      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Take Action <ArrowRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Level 4: Recent Activity + Wishlist */}
        <aside className="space-y-6">
          <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
            <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
              <History size={16} /> Recent Activity
            </div>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-foreground/40">Nothing yet — actions you take show up here.</p>
            ) : (
              <ul className="space-y-3">
                {recentEvents.map((event) => {
                  const meta = EVENT_META[event.type] ?? { label: event.type, icon: History };
                  const Icon = meta.icon;
                  const cardName = event.instance?.variant.card.name;
                  return (
                    <li key={event.id} className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                        <Icon size={13} className="text-foreground/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <span className="text-foreground/50">{meta.label}</span>{cardName ? <> <span className="text-foreground font-medium">{cardName}</span></> : null}
                        </p>
                      </div>
                      <span className="text-foreground/30 text-xs shrink-0">{timeAgo(event.timestamp)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/wishlist"
            className="block p-6 rounded-3xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors group"
          >
            <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-3">
              <Heart size={16} /> Wishlist
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-display font-bold">{wishlistCount}</p>
              <span className="text-sm text-foreground/40 group-hover:text-foreground transition-colors flex items-center gap-1">
                View <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </aside>
      </div>

      {/* Level 5: Market Movers + Franchise Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketMoversSection movers={marketMovers} />
        <FranchiseBreakdownSection breakdown={franchiseBreakdown} />
      </div>

    </div>
  );
}
