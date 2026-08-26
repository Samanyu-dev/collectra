'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// ─── Animated Counter ────────────────────────────────────────────────────────

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  duration = 1.2,
  className = '',
  formatOptions,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  const formatted = formatOptions
    ? displayValue.toLocaleString('en-IN', formatOptions)
    : displayValue.toLocaleString('en-IN');

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  max = 100,
  color,
  height = 6,
  showLabel = false,
  className = '',
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, backgroundColor: 'var(--elevated)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color || 'var(--foreground)' }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-foreground/50 font-mono min-w-[36px] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// ─── Progress Ring (Collector Score) ─────────────────────────────────────────

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#FACC15',
  className = '',
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--elevated)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  icon,
  children,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4 space-y-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/50 font-mono uppercase tracking-widest">{label}</span>
        {icon && <span className="text-foreground/50">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          className="text-2xl font-[family-name:var(--font-display)] font-bold tracking-tight"
        />
        {change !== undefined && (
          <span className={`text-xs font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
  actionHref,
}: {
  title: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-mono text-foreground/50 uppercase tracking-widest">{title}</h2>
      {action && actionHref && (
        <a href={actionHref} className="text-xs text-foreground/50 hover:text-foreground transition-colors">
          {action} →
        </a>
      )}
    </div>
  );
}

