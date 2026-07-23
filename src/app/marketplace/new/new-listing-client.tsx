"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Upload, Loader2, ArrowLeft } from "lucide-react";
import { createListing, uploadListingPhoto, publishListing } from "@/lib/actions/marketplace";

interface InstanceOption {
  id: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  condition: string;
  grade: string | null;
  imageUrl: string | null;
}

const SHIPS_TO_OPTIONS = ["Worldwide", "Europe", "India", "Local pickup"];

type Step = "pick" | "details" | "photos" | "done";

export function NewListingClient({ instances }: { instances: InstanceOption[] }) {
  const [step, setStep] = useState<Step>("pick");
  const [selected, setSelected] = useState<InstanceOption | null>(null);
  const [price, setPrice] = useState("");
  const [shipsTo, setShipsTo] = useState(SHIPS_TO_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [listingId, setListingId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= 0) {
      setError("Enter a valid price.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { listingId: id } = await createListing({ instanceId: selected.id, price: priceNum, shipsTo, description: description || undefined });
      setListingId(id);
      setStep("photos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the listing.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePhotoSelected(file: File) {
    if (!listingId) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const { url } = await uploadListingPhoto(listingId, formData);
      setPhotos((prev) => [...prev, url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!listingId) return;
    setBusy(true);
    setError(null);
    try {
      await publishListing(listingId);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't publish the listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/marketplace" className="w-9 h-9 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-display font-bold">List a card</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {step === "pick" && (
        <div className="space-y-3">
          {instances.length === 0 ? (
            <p className="text-sm text-foreground/50">Every card in your collection already has an active listing or reservation.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {instances.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    setSelected(inst);
                    setStep("details");
                  }}
                  className="text-left rounded-xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 p-2 transition-colors"
                >
                  <div className="relative aspect-[63/88] rounded-lg overflow-hidden bg-foreground/10 mb-2">
                    {inst.imageUrl && <Image src={inst.imageUrl} alt={inst.cardName} fill className="object-cover" unoptimized />}
                  </div>
                  <p className="text-xs font-medium line-clamp-1">{inst.cardName}</p>
                  <p className="text-[10px] text-foreground/40">
                    #{inst.cardNumber} · {inst.setName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "details" && selected && (
        <form onSubmit={handleCreateDraft} className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
            <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
              {selected.imageUrl && <Image src={selected.imageUrl} alt={selected.cardName} fill className="object-cover" unoptimized />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selected.cardName}</p>
              <p className="text-xs text-foreground/40">
                {selected.condition}
                {selected.grade ? ` · ${selected.grade}` : ""}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-foreground/40">Price (USD)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="mt-1 w-full bg-foreground/5 border border-foreground/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-foreground/40">Ships to</label>
            <select
              value={shipsTo}
              onChange={(e) => setShipsTo(e.target.value)}
              className="mt-1 w-full bg-foreground/5 border border-foreground/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {SHIPS_TO_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-foreground/40">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-foreground/5 border border-foreground/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {busy ? "Saving…" : "Continue to photos"}
          </button>
        </form>
      )}

      {step === "photos" && (
        <div className="space-y-5">
          <p className="text-sm text-foreground/60">Add at least one real photo of this exact card — not catalog artwork.</p>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((url) => (
              <div key={url} className="relative aspect-[63/88] rounded-lg overflow-hidden bg-foreground/10">
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="aspect-[63/88] rounded-lg border-2 border-dashed border-foreground/20 flex flex-col items-center justify-center gap-1 text-foreground/40 hover:border-foreground/40 transition-colors"
            >
              {busy ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span className="text-[10px]">Add photo</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoSelected(e.target.files[0])}
          />
          <button
            onClick={handlePublish}
            disabled={busy || photos.length === 0}
            className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {busy ? "Publishing…" : "Publish listing"}
          </button>
        </div>
      )}

      {step === "done" && listingId && (
        <div className="text-center py-12 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <Check size={24} className="text-green-400" />
          </div>
          <p className="font-bold">Your listing is live.</p>
          <div className="flex gap-3 justify-center">
            <Link href={`/marketplace/${listingId}`} className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              View listing
            </Link>
            <Link href="/marketplace/selling" className="px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors">
              Manage listings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
