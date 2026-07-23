"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { withdrawListing, cancelReservation, markListingSold, replyToInquiry } from "@/lib/actions/marketplace";

interface Inquiry {
  id: string;
  buyerName: string;
  message: string;
  reply: string | null;
  respondedAt: string | Date | null;
}

interface ListingRow {
  id: string;
  status: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  reservedByName: string | null;
  inquiries: Inquiry[];
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-foreground/10 text-foreground/50",
  ACTIVE: "bg-green-500/10 text-green-400",
  RESERVED: "bg-yellow-500/10 text-yellow-500",
  SOLD: "bg-foreground/10 text-foreground/50",
  WITHDRAWN: "bg-foreground/5 text-foreground/30",
  EXPIRED: "bg-foreground/5 text-foreground/30",
};

export function SellingClient({ listings }: { listings: ListingRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<void>) {
    setError(null);
    setBusyId(id);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold">Your Listings</h1>
        <Link href="/marketplace/new" className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          <Plus size={14} /> List a card
        </Link>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {listings.length === 0 && <p className="text-sm text-foreground/50">You haven&apos;t listed anything yet.</p>}

      <div className="space-y-3">
        {listings.map((l) => {
          const pending = l.inquiries.filter((i) => !i.respondedAt).length;
          const busy = busyId === l.id;
          return (
            <div key={l.id} className="rounded-2xl border border-foreground/10 bg-foreground/5 overflow-hidden">
              <div className="p-3 flex items-center gap-3">
                <Link href={`/marketplace/${l.id}`} className="relative w-12 h-16 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
                  {l.imageUrl && <Image src={l.imageUrl} alt={l.cardName} fill className="object-cover" unoptimized />}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{l.cardName}</p>
                  <p className="text-xs text-foreground/40">
                    #{l.cardNumber} · {l.setName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${STATUS_STYLE[l.status] ?? ""}`}>{l.status}</span>
                    <span className="text-xs font-mono text-foreground/50">
                      {l.currency === "USD" ? "$" : `${l.currency} `}
                      {l.price.toFixed(2)}
                    </span>
                    {l.status === "RESERVED" && l.reservedByName && <span className="text-[10px] text-foreground/40">by {l.reservedByName}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {(l.status === "ACTIVE" || l.status === "RESERVED") && (
                    <button
                      disabled={busy}
                      onClick={() => run(l.id, () => markListingSold(l.id))}
                      className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                    >
                      Mark Sold
                    </button>
                  )}
                  {l.status === "RESERVED" && (
                    <button
                      disabled={busy}
                      onClick={() => run(l.id, () => cancelReservation(l.id))}
                      className="px-3 py-1.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-xs font-medium disabled:opacity-50"
                    >
                      Cancel reservation
                    </button>
                  )}
                  {(l.status === "DRAFT" || l.status === "ACTIVE" || l.status === "RESERVED") && (
                    <button
                      disabled={busy}
                      onClick={() => run(l.id, () => withdrawListing(l.id))}
                      className="px-3 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-xs text-foreground/50 disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>

              {l.inquiries.length > 0 && (
                <div className="border-t border-foreground/10">
                  <button
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-xs text-foreground/50 hover:bg-foreground/5 transition-colors"
                  >
                    <MessageSquare size={12} />
                    {l.inquiries.length} message{l.inquiries.length === 1 ? "" : "s"}
                    {pending > 0 && <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{pending} pending</span>}
                  </button>
                  {expandedId === l.id && (
                    <div className="px-3 pb-3 space-y-3">
                      {l.inquiries.map((inq) => (
                        <InquiryRow key={inq.id} inquiry={inq} onReplied={() => router.refresh()} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InquiryRow({ inquiry, onReplied }: { inquiry: Inquiry; onReplied: () => void }) {
  const [reply, setReply] = useState(inquiry.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await replyToInquiry(inquiry.id, reply);
      onReplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-2.5 rounded-xl bg-foreground/5 border border-foreground/10 space-y-2">
      <p className="text-xs">
        <span className="font-medium">{inquiry.buyerName}:</span> {inquiry.message}
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <form onSubmit={handleReply} className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply…"
          className="flex-1 bg-background/50 border border-foreground/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          type="submit"
          disabled={busy || !reply.trim()}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40"
        >
          {inquiry.respondedAt ? "Update" : "Reply"}
        </button>
      </form>
    </div>
  );
}
