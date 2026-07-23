"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

export function QuantityControl({
  quantity,
  onIncrement,
  onDecrement,
  disabled = false,
  compact = false,
  className = "",
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (quantity <= 0) {
    return (
      <motion.button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        whileTap={{ scale: 0.96 }}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/10 text-foreground hover:bg-foreground/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
          compact ? "h-8 px-3 text-[10px] font-bold uppercase tracking-wide" : "h-12 px-5 text-sm font-medium"
        } ${className}`}
      >
        <Plus size={compact ? 12 : 16} strokeWidth={3} />
        Add to Collection
      </motion.button>
    );
  }

  const buttonSize = compact ? "h-8 w-8" : "h-12 w-12";
  const countSize = compact ? "h-8 min-w-10 text-xs" : "h-12 min-w-14 text-base";

  return (
    <div
      className={`inline-flex items-center rounded-full border border-primary/35 bg-primary/10 text-primary shadow-lg shadow-primary/5 overflow-hidden ${className}`}
      aria-label={`Quantity owned: ${quantity}`}
    >
      <motion.button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        whileTap={{ scale: 0.88 }}
        className={`${buttonSize} inline-flex items-center justify-center hover:bg-primary/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
        aria-label="Decrease quantity"
      >
        <Minus size={compact ? 12 : 16} strokeWidth={3} />
      </motion.button>
      <div className={`${countSize} grid place-items-center border-x border-primary/20 bg-background/35 font-mono font-bold tabular-nums`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={quantity}
            initial={{ opacity: 0, y: quantity > 1 ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: quantity > 1 ? 8 : -8 }}
            transition={{ duration: 0.16 }}
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        whileTap={{ scale: 0.88 }}
        className={`${buttonSize} inline-flex items-center justify-center hover:bg-primary/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
        aria-label="Increase quantity"
      >
        <Plus size={compact ? 12 : 16} strokeWidth={3} />
      </motion.button>
    </div>
  );
}
