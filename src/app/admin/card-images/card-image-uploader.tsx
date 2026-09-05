"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { Search, Upload, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { uploadCardImage } from "@/lib/actions/catalog-images";

interface CardResult {
  id: string;
  name: string;
  number: string;
  set: { name: string; series: { franchise: { name: string } } };
  images: { url: string; type: string }[];
}

// Only these two franchises already have good official artwork worth
// keeping — every other franchise's images are being replaced by our own.
const PROTECTED_FRANCHISES = ["pokémon", "pokemon", "yu-gi-oh"];

function isProtectedFranchise(franchiseName: string): boolean {
  const n = franchiseName.toLowerCase();
  return PROTECTED_FRANCHISES.some((p) => n.includes(p));
}

export function CardImageUploader() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CardResult | null>(null);

  async function runSearch(q: string) {
    setQuery(q);
    setSelected(null);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.cards ?? []);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Search for a card by name, set, or number…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
        />
      </div>

      {loading && <p className="text-xs text-foreground/40">Searching…</p>}

      {!selected && results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((card) => {
            const franchise = card.set.series.franchise.name;
            const current = card.images[0];
            return (
              <button
                key={card.id}
                onClick={() => setSelected(card)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-foreground/10 hover:border-primary/40 text-left transition-colors"
              >
                <div className="w-10 h-14 rounded-md bg-foreground/10 overflow-hidden shrink-0">
                  {current && <img src={current.url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {card.name} · #{card.number}
                  </p>
                  <p className="text-xs text-foreground/40 truncate">
                    {card.set.name} · {franchise}
                  </p>
                </div>
                {isProtectedFranchise(franchise) && (
                  <span className="text-[10px] font-mono uppercase tracking-wide text-yellow-500 shrink-0">
                    has official art
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && <UploadForm card={selected} onDone={reset} />}
    </div>
  );
}

function UploadForm({ card, onDone }: { card: CardResult; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const franchise = card.set.series.franchise.name;

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setDone(false);
    setError(null);
  }

  function submit() {
    if (!file) return;
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      try {
        await uploadCardImage(card.id, formData);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  return (
    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {card.name} · #{card.number}
          </p>
          <p className="text-xs text-foreground/40 truncate">
            {card.set.name} · {franchise}
          </p>
        </div>
        <button onClick={onDone} className="text-xs text-foreground/40 hover:text-foreground shrink-0">
          Cancel
        </button>
      </div>

      {isProtectedFranchise(franchise) && (
        <p className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {franchise} already has good official artwork — uploading here replaces it. Only do this if you mean to.
        </p>
      )}

      <div className="flex items-center gap-3">
        {preview && (
          <img src={preview} alt="" className="w-16 h-24 object-cover rounded-lg border border-foreground/10 shrink-0" />
        )}
        {/* capture="environment" opens the rear camera directly on mobile; desktop browsers just fall back to a file picker. */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="text-xs text-foreground/60 flex-1"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={!file || pending || done}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : done ? <CheckCircle2 size={14} /> : <Upload size={14} />}
        {pending ? "Uploading…" : done ? "Uploaded" : "Upload to R2"}
      </button>
    </div>
  );
}
