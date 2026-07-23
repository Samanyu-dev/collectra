"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, Check, AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { uploadScanPhoto, identifyScan, confirmScanMatch, type EnrichedCandidate, type IdentifyScanResponse } from "@/lib/actions/scanner";
import { PriceTag, type PriceTagData } from "@/components/ui/price-tag";

type Step = "capture" | "uploading" | "identifying" | "results" | "confirming" | "success" | "error";

const CONDITIONS = ["Mint", "Near Mint", "Lightly Played", "Heavily Played"];

export function ScanClient() {
  const [step, setStep] = useState<Step>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyScanResponse | null>(null);
  const [selected, setSelected] = useState<EnrichedCandidate | null>(null);
  const [condition, setCondition] = useState(CONDITIONS[1]);
  const [contributeToPublicCatalog, setContributeToPublicCatalog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PriceTagData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("capture");
    setPreviewUrl(null);
    setMediaId(null);
    setResult(null);
    setSelected(null);
    setCondition(CONDITIONS[1]);
    setContributeToPublicCatalog(false);
    setErrorMessage(null);
    setPriceData(null);
  }

  async function handleFileSelected(file: File) {
    setStep("uploading");
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const { mediaId: newMediaId, previewUrl: url } = await uploadScanPhoto(formData);
      setMediaId(newMediaId);
      setPreviewUrl(url);

      setStep("identifying");
      const identified = await identifyScan(newMediaId);
      setResult(identified);

      if (identified.ocrConfigured && identified.resolved) {
        setSelected(identified.resolved);
      }
      setStep("results");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong while scanning.");
      setStep("error");
    }
  }

  async function handleConfirm() {
    if (!mediaId || !selected) return;
    setStep("confirming");
    try {
      const { price } = await confirmScanMatch({ mediaId, variantId: selected.variantId, condition, contributeToPublicCatalog });
      setPriceData(price);
      setStep("success");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't add this card to your collection.");
      setStep("error");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 flex items-center justify-between px-4 border-b border-foreground/10 shrink-0">
        <Link href="/" className="w-9 h-9 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display font-bold text-lg">Scan a Card</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-12">
              <div className="w-24 h-24 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                <Camera size={36} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground/70 max-w-xs">Take a clear, well-lit photo of a single card — avoid glare and keep it flat.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors min-h-[52px]"
              >
                <Camera size={18} /> Take Photo / Upload
              </button>
              <p className="text-xs text-foreground/40 flex items-center gap-1.5">
                <Upload size={12} /> Works with your camera or an existing photo
              </p>
            </motion.div>
          )}

          {(step === "uploading" || step === "identifying" || step === "confirming") && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              {previewUrl && (
                <div className="relative w-40 h-56 rounded-2xl overflow-hidden border border-foreground/10 shadow-xl">
                  <Image src={previewUrl} alt="Your scan" fill className="object-cover" unoptimized />
                </div>
              )}
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-sm text-foreground/50">
                {step === "uploading" ? "Uploading photo…" : step === "identifying" ? "Identifying card…" : "Adding to your collection…"}
              </p>
            </motion.div>
          )}

          {step === "results" && result && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-6 py-6">
              {!result.ocrConfigured ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
                  <AlertTriangle size={32} className="text-yellow-500" />
                  <div>
                    <p className="font-medium">Scanning isn&apos;t set up yet</p>
                    <p className="text-sm text-foreground/50 mt-1 max-w-xs">
                      Card identification needs an OCR provider configured on this deployment. Your photo was saved — try again once it&apos;s set up, or add this card manually.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Link href="/cards" className="px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors">
                      Search manually
                    </Link>
                    <button onClick={reset} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm font-medium transition-colors">
                      Scan another
                    </button>
                  </div>
                </div>
              ) : result.resolved ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-mono text-foreground/40 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-green-400" /> {result.confidenceLabel} confidence match
                  </div>
                  <CandidateCard candidate={result.resolved} selected onSelect={() => setSelected(result.resolved)} />
                  <ExtractedTextNote result={result} />
                </>
              ) : result.candidates.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-mono text-foreground/40 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> {result.candidates.length} possible matches — pick one
                  </div>
                  <div className="space-y-3">
                    {result.candidates.map((c) => (
                      <CandidateCard key={c.variantId} candidate={c} selected={selected?.variantId === c.variantId} onSelect={() => setSelected(c)} />
                    ))}
                  </div>
                  <ExtractedTextNote result={result} />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
                  <AlertTriangle size={32} className="text-foreground/30" />
                  <div>
                    <p className="font-medium">Couldn&apos;t identify this card</p>
                    <ExtractedTextNote result={result} />
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Link href="/cards" className="px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors">
                      Search manually
                    </Link>
                    <button onClick={reset} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm font-medium transition-colors flex items-center gap-1.5">
                      <RotateCcw size={14} /> Retake
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check size={28} className="text-green-400" />
              </div>
              <div>
                <p className="font-bold text-lg">{selected?.cardName} added</p>
                <p className="text-sm text-foreground/50 mt-1">Now in your Shelf.</p>
              </div>
              {priceData && (
                <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10">
                  <PriceTag data={priceData} />
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <Link href="/shelf" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold transition-colors">
                  View Shelf
                </Link>
                <button onClick={reset} className="px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors">
                  Scan another
                </button>
              </div>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
              <AlertTriangle size={32} className="text-red-400" />
              <p className="text-sm text-foreground/60 max-w-xs">{errorMessage}</p>
              <button onClick={reset} className="px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors">
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {step === "results" && result && (result.ocrConfigured && (result.resolved || result.candidates.length > 0)) && (
          <div className="mt-6 space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-foreground/40">Condition</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
                    condition === c ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10 text-foreground/70"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contributeToPublicCatalog}
                onChange={(e) => setContributeToPublicCatalog(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-xs text-foreground/60">
                Contribute this photo to the public catalog? Real card photos help every collector — it'll be reviewed before it's shown to others.
                Leave unchecked to keep it private to your own collection.
              </span>
            </label>
          </div>
        )}
      </main>

      {step === "results" && result?.ocrConfigured && selected && (
        <BottomConfirmBar onConfirm={handleConfirm} label={`Add ${selected.cardName} — ${condition}`} />
      )}
    </div>
  );
}

function ExtractedTextNote({ result }: { result: IdentifyScanResponse }) {
  if (!result.ocrConfigured) return null;
  return (
    <p className="text-[11px] text-foreground/30 font-mono">
      Read from photo: {result.extractedName ?? "—"}
      {result.extractedCardNumber ? ` #${result.extractedCardNumber}` : ""}
    </p>
  );
}

function CandidateCard({ candidate, selected, onSelect }: { candidate: EnrichedCandidate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-3 rounded-2xl border text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
      }`}
    >
      <div className="w-14 h-20 relative rounded-lg overflow-hidden bg-foreground/10 shrink-0">
        {candidate.imageUrl ? (
          <Image src={candidate.imageUrl} alt={candidate.cardName} fill className="object-cover" unoptimized />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{candidate.cardName}</p>
        <p className="text-xs text-foreground/50 truncate">
          #{candidate.cardNumber} · {candidate.setName}
        </p>
      </div>
      {selected && <Check size={18} className="text-primary shrink-0" />}
    </button>
  );
}

function BottomConfirmBar({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  return (
    <div className="sticky bottom-0 p-4 bg-background/95 backdrop-blur-md border-t border-foreground/10">
      <button
        onClick={onConfirm}
        className="max-w-md mx-auto w-full flex items-center justify-center py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors min-h-[52px]"
      >
        {label}
      </button>
    </div>
  );
}
