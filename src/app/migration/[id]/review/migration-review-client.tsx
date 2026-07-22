'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, AlertTriangle, Info, GitMerge, CheckCircle2 } from 'lucide-react';
import { resolveMigrationRow, ignoreMigrationRow } from '@/lib/migration/actions/rows';
import { commitMigration } from '@/lib/migration/actions/commit';

const ADAPTER_NAMES: Record<string, string> = {
  tcgplayer_v1: 'TCGPlayer Export',
  generic_csv: 'Generic Spreadsheet',
};

interface Candidate {
  variantId: string;
  confidence: number;
  name: string;
  imageUrl: string | null;
}

interface CurrentRow {
  id: string;
  originalData: Record<string, string>;
  confidenceScore: number;
  reasons: string[];
  candidates: Candidate[];
}

export function MigrationReviewClient({
  sessionId,
  sessionStatus,
  fileLabel,
  matchedCount,
  reviewRemaining,
  isDone,
  currentRow,
}: {
  sessionId: string;
  sessionStatus: string;
  fileLabel: string;
  matchedCount: number;
  reviewRemaining: number;
  isDone: boolean;
  currentRow: CurrentRow | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [committed, setCommitted] = useState<{ importedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(variantId: string) {
    if (!currentRow) return;
    startTransition(async () => {
      await resolveMigrationRow(currentRow.id, variantId);
      router.refresh();
    });
  }

  function handleIgnore() {
    if (!currentRow) return;
    startTransition(async () => {
      await ignoreMigrationRow(currentRow.id);
      router.refresh();
    });
  }

  function handleCommit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await commitMigration(sessionId);
        setCommitted(result);
      } catch (e: any) {
        setError(e.message || 'Failed to commit migration.');
      }
    });
  }

  if (sessionStatus === 'COMPLETED' || committed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-md">
          <CheckCircle2 size={48} className="text-green-400 mx-auto" />
          <h1 className="text-3xl font-display font-bold">Import complete</h1>
          <p className="text-foreground/50">
            {committed ? `${committed.importedCount} cards were added to your collection.` : 'This import has already been committed.'}
          </p>
          <Link href="/shelf" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors">
            View Your Shelf
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans flex flex-col">

      <header className="h-16 border-b border-foreground/10 flex items-center justify-between px-6 shrink-0 bg-elevated">
        <div className="flex items-center gap-4">
          <Link href="/migration" className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs font-mono text-foreground/40 uppercase tracking-widest">Staging Area</span>
            <span className="font-medium">{ADAPTER_NAMES[fileLabel] || fileLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm font-mono text-foreground/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> {matchedCount} Matched
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> {reviewRemaining} Review
            </div>
          </div>

          <button
            onClick={handleCommit}
            disabled={isPending || matchedCount === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold text-sm hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:hover:scale-100"
          >
            <GitMerge size={16} /> Commit Migration
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm px-6 py-3">{error}</div>
      )}

      {isDone || !currentRow ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <CheckCircle2 size={40} className="text-green-400 mx-auto" />
            <h2 className="text-2xl font-display font-bold">Review queue is clear</h2>
            <p className="text-foreground/50">
              {matchedCount} row{matchedCount === 1 ? '' : 's'} ready to commit to your collection.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          <div className="w-full md:w-1/3 border-r border-foreground/10 bg-elevated p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-mono font-bold uppercase tracking-widest mb-6">
                <AlertTriangle size={14} /> Review Queue ({reviewRemaining} left)
              </div>

              <h2 className="text-3xl font-display font-bold mb-8">Match Confidence: {Math.round(currentRow.confidenceScore)}%</h2>

              <div className="bg-foreground/5 rounded-xl border border-foreground/10 overflow-hidden mb-8">
                <div className="bg-foreground/5 px-4 py-2 border-b border-foreground/10 text-xs font-mono text-foreground/40 uppercase tracking-widest">
                  Original Row
                </div>
                <div className="p-4 space-y-3">
                  {Object.entries(currentRow.originalData).filter(([, v]) => v).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-foreground/40 font-mono">{key}</span>
                      <span className="font-medium text-right break-all ml-4">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-foreground/40 uppercase tracking-widest mb-4">
                  <Info size={14} /> Engine Reasoning
                </div>
                {currentRow.reasons.map((reason, idx) => (
                  <div key={idx} className={`p-3 rounded-lg text-sm font-mono flex items-start gap-3 ${reason.includes('[✓]') ? 'bg-green-500/10 text-green-400' : reason.includes('[✕]') ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleIgnore}
              disabled={isPending}
              className="w-full py-4 rounded-xl border border-foreground/20 text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors font-medium mt-8 disabled:opacity-40"
            >
              Ignore this Row
            </button>
          </div>

          <div className="flex-1 bg-background p-8 flex flex-col">
            <h3 className="text-xl font-display text-foreground/60 mb-8">Select the correct Variant to resolve:</h3>

            {currentRow.candidates.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-foreground/40 max-w-md mx-auto">
                <p>No candidate variants could be found for this row. Ignore it to skip, or refine the catalog data and re-import.</p>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                {currentRow.candidates.map((candidate, idx) => (
                  <button
                    key={candidate.variantId}
                    onClick={() => handleSelect(candidate.variantId)}
                    disabled={isPending}
                    className="group relative flex flex-col items-center text-left rounded-3xl bg-foreground/5 border border-foreground/10 hover:border-primary hover:bg-foreground/10 p-4 transition-all duration-300 disabled:opacity-50"
                  >
                    {idx === 0 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg z-20">
                        Highest Confidence
                      </div>
                    )}

                    <div className="w-full aspect-[63/88] relative rounded-2xl overflow-hidden mb-4 shadow-xl bg-foreground/5">
                      {candidate.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.imageUrl} alt={candidate.name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs p-4 text-center">{candidate.name}</div>
                      )}

                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-50 group-hover:scale-100 transition-transform duration-300">
                          <Check size={32} />
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      <h4 className="font-bold text-lg leading-tight">{candidate.name}</h4>
                      <p className="text-sm text-foreground/50 font-mono mt-1">Engine Match: {Math.round(candidate.confidence)}%</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
