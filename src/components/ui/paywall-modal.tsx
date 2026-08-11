"use client";

import Link from "next/link";
import { X, Sparkles } from "lucide-react";

export function PaywallModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-background border border-foreground/10 rounded-3xl p-6 space-y-5 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/50"
        >
          <X size={14} />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">Upgrade to Pro</h3>
          <p className="text-sm text-foreground/60 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/pricing"
            className="flex-1 text-center px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            See Pro plan
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
