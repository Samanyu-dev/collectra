import type { ReactNode } from "react";

/**
 * Simple, non-collapsible styled container for the Collection sidebar —
 * everything there is always-open by design (no accordion), so this is
 * intentionally not an accordion primitive.
 */
export function SidebarWidget({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono uppercase tracking-widest text-foreground/40">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
