'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Activity, Layers, Lightbulb, LineChart } from 'lucide-react';
import { StatCard, SectionHeader, ProgressRing } from '@/components/ui/collectra-ui';
import { PortfolioChart } from '@/components/ui/portfolio-chart';

interface DnaEntry {
  name: string;
  count: number;
  percentage: number;
}

interface InsightItem {
  id: string;
  type: string;
  severity: string;
  payload: Record<string, any>;
}

const FRANCHISE_COLORS = ['#e5e7eb', '#a3a3a3', '#737373', '#525252', '#404040', '#facc15', '#4ade80', '#60a5fa'];

export function StatisticsClient({
  totalCards,
  uniqueCards,
  portfolioValue,
  costBasis,
  healthScore,
  completionScore,
  liquidityScore,
  duplicateCount,
  dna,
  insights,
  portfolioHistory,
}: {
  totalCards: number;
  uniqueCards: number;
  portfolioValue: number;
  costBasis: number;
  healthScore: number;
  completionScore: number;
  liquidityScore: number;
  duplicateCount: number;
  dna: DnaEntry[];
  insights: InsightItem[];
  portfolioHistory: { date: string; value: number }[];
}) {
  const gainLoss = portfolioValue - costBasis;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold tracking-tight">
          Statistics & Insights
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Real numbers from your actual collection — no placeholders.
        </p>
      </motion.div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Cards" value={totalCards} icon={<Activity size={16} />} delay={1} />
        <StatCard label="Unique Cards" value={uniqueCards} icon={<Layers size={16} />} delay={2} />
        <StatCard
          label="Est. Value"
          value={Math.round(portfolioValue)}
          prefix="$"
          change={costBasis > 0 ? Math.round((gainLoss / costBasis) * 100) : undefined}
          icon={<TrendingUp size={16} />}
          delay={3}
        />
        <StatCard label="Cost Basis" value={Math.round(costBasis)} prefix="$" delay={4} />
      </div>

      {totalCards === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl bg-card/50">
          <p className="font-medium text-foreground">No cards tracked yet</p>
          <p className="text-sm mt-1">Add cards to your collection to see real stats here.</p>
        </div>
      )}

      {totalCards > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <SectionHeader title="Portfolio Growth" />
          {portfolioHistory.length >= 2 ? (
            <div className="h-48 sm:h-64 mt-2">
              <PortfolioChart data={portfolioHistory} />
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
              <LineChart size={24} className="opacity-30" />
              <p className="text-sm max-w-sm">
                Add purchase dates to your cards to see how your collection's value has grown over time.
              </p>
            </div>
          )}
        </motion.section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Collection Health */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <SectionHeader title="Collection Health" />
          <div className="flex flex-col sm:flex-row items-center gap-8 mb-2">
            <ProgressRing value={healthScore} size={140} strokeWidth={8} color="var(--primary)">
              <span className="text-4xl font-[family-name:var(--font-display)] font-bold">{healthScore}</span>
            </ProgressRing>
            <div className="flex-1 w-full space-y-4">
              {[
                { label: 'Active Project Completion', value: completionScore },
                { label: 'Liquidity (priced cards)', value: Math.round(liquidityScore * 100) },
              ].map((item, i) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}/100</span>
                  </div>
                  <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">{duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'} in your collection</p>
            </div>
          </div>
        </motion.section>

        {/* Taste Profile */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <SectionHeader title="Collection Breakdown" />
          {dna.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">No cards owned yet — this fills in as you track your collection.</p>
          ) : (
            <div className="space-y-5 mt-4">
              {dna.map((entry, i) => (
                <div key={entry.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FRANCHISE_COLORS[i % FRANCHISE_COLORS.length] }} />
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-[family-name:var(--font-display)] font-semibold">{entry.percentage}%</span>
                      <span className="text-xs text-muted-foreground ml-2">({entry.count} cards)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-elevated rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: FRANCHISE_COLORS[i % FRANCHISE_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.7 + i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {/* Insights */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.8 }}>
        <SectionHeader title="Insights" />
        {insights.length === 0 ? (
          <div className="py-12 bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
            <Lightbulb size={28} className="mb-3 opacity-40" />
            <p className="text-sm">No insights yet — they'll appear as you build up your collection.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <Lightbulb size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  {insight.type === 'SELL_DUPLICATE' && (
                    <p>
                      You have <strong>{insight.payload.duplicateCount}</strong> duplicate card{insight.payload.duplicateCount === 1 ? '' : 's'}
                      {insight.payload.estimatedRecoveryValue != null && (
                        <> worth an estimated <strong>${Math.round(insight.payload.estimatedRecoveryValue).toLocaleString()}</strong></>
                      )}.
                    </p>
                  )}
                  {insight.type === 'SET_COMPLETION' && (
                    <p>
                      <strong>{insight.payload.projectName}</strong> is close — just <strong>{insight.payload.cardsRemaining}</strong> card{insight.payload.cardsRemaining === 1 ? '' : 's'} away
                      {insight.payload.estimatedCost != null && (
                        <> (~<strong>${Math.round(insight.payload.estimatedCost).toLocaleString()}</strong> at current market prices)</>
                      )}.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
