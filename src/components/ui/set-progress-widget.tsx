"use client";

import { useState } from "react";
import { ProgressBar } from "./collectra-ui";
import type { SetProgressEntry } from "@/lib/collection/workspace";

function SetProgressRow({ entry }: { entry: SetProgressEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasTeams = entry.teams.length > 0;

  return (
    <div className="py-2.5">
      <button
        type="button"
        onClick={() => hasTeams && setExpanded((e) => !e)}
        className={`w-full text-left ${hasTeams ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{entry.setName}</span>
          <span className="text-xs font-mono text-foreground/50 shrink-0 ml-2">
            {entry.owned}/{entry.total}
          </span>
        </div>
        <ProgressBar value={entry.percent} color="#FACC15" showLabel />
        <div className="flex items-center justify-between mt-1 text-[11px] text-foreground/40">
          <span>{entry.missing} missing</span>
          {entry.nextMilestonePercent != null && (
            <span>
              Next: {entry.nextMilestonePercent}% ({entry.cardsToNextMilestone} more)
            </span>
          )}
        </div>
      </button>
      {expanded && hasTeams && (
        <div className="mt-2 pl-2 border-l border-foreground/10 space-y-1">
          {entry.teams.slice(0, 6).map((t) => (
            <div key={t.teamId} className="flex items-center justify-between text-[11px] text-foreground/60">
              <span className="truncate">{t.teamName}</span>
              <span className="font-mono shrink-0 ml-2">
                {t.owned}/{t.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Set/Collection Progress — completion tracking with next-milestone framing, ranked high per review since it gives collectors a concrete goal. */
export function SetProgressWidget({ entries }: { entries: SetProgressEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-foreground/40">Add cards from a set to see completion progress.</p>;
  }
  return <div className="divide-y divide-foreground/10">{entries.slice(0, 5).map((entry) => <SetProgressRow key={entry.setId} entry={entry} />)}</div>;
}
