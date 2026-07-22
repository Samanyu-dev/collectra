'use client';

import { motion } from 'framer-motion';
import { ProgressRing, ProgressBar, AnimatedNumber } from './collectra-ui';

export interface SubtypeBreakdown {
  label: string;
  owned: number;
  total: number;
}

export function CollectionStats({
  owned,
  total,
  breakdown,
}: {
  owned: number;
  total: number;
  breakdown: SubtypeBreakdown[];
}) {
  const percentage = total > 0 ? Math.round((owned / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Overall completion ring */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-foreground/10 bg-foreground/5 p-8 flex flex-col items-center justify-center gap-4"
      >
        <ProgressRing value={owned} max={total || 1} size={140} strokeWidth={10} color="var(--primary)">
          <div className="flex flex-col items-center">
            <AnimatedNumber value={percentage} suffix="%" className="text-3xl font-display font-bold text-foreground" />
            <span className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1">Complete</span>
          </div>
        </ProgressRing>
        <p className="text-foreground/60 font-mono text-sm">
          <AnimatedNumber value={owned} className="text-foreground font-bold" /> / {total} cards owned
        </p>
      </motion.div>

      {/* Breakdown by insert/parallel type */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-6 space-y-4"
      >
        <h3 className="text-sm font-mono uppercase tracking-widest text-foreground/40">Progress by Set</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {breakdown.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.03 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/70 font-medium truncate pr-2">{b.label}</span>
                <span className="text-foreground/40 font-mono shrink-0">{b.owned}/{b.total}</span>
              </div>
              <ProgressBar value={b.owned} max={b.total} color="var(--primary)" height={5} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
