"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SmartSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export function SmartSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Select...",
  emptyLabel = "No options found",
  searchable,
  className = "",
  size = "md",
}: {
  value: string;
  options: SmartSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  emptyLabel?: string;
  searchable?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const shouldSearch = searchable ?? options.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.description?.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const idx = Math.max(filtered.findIndex((option) => option.value === value), 0);
    setActiveIndex(idx);
    if (shouldSearch) requestAnimationFrame(() => searchRef.current?.focus());
  }, [filtered, open, shouldSearch, value]);

  function choose(option: SmartSelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(idx + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(idx - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) choose(option);
    }
  }

  const triggerSize = size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-3.5 text-sm";

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full inline-flex items-center justify-between gap-3 rounded-full border border-foreground/10 bg-foreground/5 ${triggerSize} text-foreground shadow-sm hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors`}
      >
        <span className="min-w-0 flex items-center gap-2">
          {selected?.icon}
          <span className={selected ? "truncate" : "truncate text-foreground/45"}>{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-foreground/45 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full min-w-[220px] overflow-hidden rounded-xl border border-foreground/10 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-xl"
          >
            {shouldSearch && (
              <div className="relative border-b border-foreground/10">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Search..."
                  className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-foreground/30"
                />
              </div>
            )}

            <div role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-foreground/40">{emptyLabel}</div>
              ) : (
                filtered.map((option, index) => {
                  const active = activeIndex === index;
                  const checked = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        active ? "bg-foreground/10 text-foreground" : "text-foreground/70"
                      }`}
                    >
                      <span className="w-4 shrink-0 text-primary">{checked ? <Check size={14} strokeWidth={3} /> : option.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.description && <span className="block truncate text-[11px] text-foreground/40">{option.description}</span>}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
