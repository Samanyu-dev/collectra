"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Package, User as UserIcon, ScanLine } from "lucide-react";
import { PriceTag, type PriceTagData } from "@/components/ui/price-tag";
import { reserveListing, createListingInquiry } from "@/lib/actions/marketplace";
import type { SellerTrustFacts } from "@/lib/marketplace/queries";

interface ListingDetail {
  id: string;
  status: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  condition: string;
  grade: string | null;
  description: string | null;
  price: number;
  currency: string;
  shipsTo: string;
  photos: string[];
  seller: { id: string; name: string | null; username: string | null };
  isOwnListing: boolean;
  isSignedIn: boolean;
  priceAnchor: PriceTagData;
  myInquiry: { message: string; reply: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  RESERVED: "Reserved",
  SOLD: "Sold",
  WITHDRAWN: "Withdrawn",
  EXPIRED: "Expired",
};

export function ListingDetailClient({ listing, trustFacts }: { listing: ListingDetail; trustFacts: SellerTrustFacts }) {
  const router = useRouter();
  const [activePhoto, setActivePhoto] = useState(0);
  const [reserving, setReserving] = useState(false);
  const [message, setMessage] = useState(listing.myInquiry?.message ?? "");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(!!listing.myInquiry);
  const [error, setError] = useState<string | null>(null);

  async function handleReserve() {
    setError(null);
    setReserving(true);
    try {
      await reserveListing(listing.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reserve this listing.");
    } finally {
      setReserving(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSendingMessage(true);
    try {
      await createListingInquiry(listing.id, message);
      setMessageSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your message.");
    } finally {
      setSendingMessage(false);
    }
  }

  const sellerName = listing.seller.name || listing.seller.username || "A collector";

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {listing.isOwnListing && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm">This is your listing.</p>
          <Link href="/marketplace/selling" className="text-sm font-bold text-primary hover:underline">
            Manage your listings →
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="relative aspect-[63/88] rounded-2xl overflow-hidden bg-foreground/5 border border-foreground/10">
            {listing.photos[activePhoto] ? (
              <Image src={listing.photos[activePhoto]} alt={listing.cardName} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground/30">{listing.cardName}</div>
            )}
          </div>
          {listing.photos.length > 1 && (
            <div className="flex gap-2">
              {listing.photos.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActivePhoto(i)}
                  className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 shrink-0 ${i === activePhoto ? "border-primary" : "border-transparent opacity-60"}`}
                >
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/40">
              <StatusBadge status={listing.status} /> {STATUS_LABEL[listing.status] ?? listing.status}
            </div>
            <h1 className="text-2xl font-display font-bold mt-1">{listing.cardName}</h1>
            <p className="text-sm text-foreground/50">#{listing.cardNumber} · {listing.setName}</p>
          </div>

          <div>
            <p className="text-3xl font-bold">
              {listing.currency === "USD" ? "$" : `${listing.currency} `}
              {listing.price.toFixed(2)}
            </p>
            <div className="mt-1 text-xs text-foreground/40 flex items-center gap-1.5">
              Catalog reference price: <PriceTag compact data={listing.priceAnchor} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-foreground/5 border border-foreground/10">{listing.condition}</span>
            {listing.grade && <span className="px-3 py-1.5 rounded-full bg-foreground/5 border border-foreground/10">{listing.grade}</span>}
            <span className="px-3 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 flex items-center gap-1.5">
              <Package size={12} /> Ships to: {listing.shipsTo}
            </span>
          </div>

          {listing.description && <p className="text-sm text-foreground/70 whitespace-pre-wrap">{listing.description}</p>}

          <SellerPanel sellerName={sellerName} trustFacts={trustFacts} />

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!listing.isOwnListing && listing.status === "ACTIVE" && (
            <div className="space-y-3">
              {!listing.isSignedIn ? (
                <Link href="/login" className="block w-full text-center py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  Sign in to reserve or message the seller
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleReserve}
                    disabled={reserving}
                    className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {reserving ? "Reserving…" : "Reserve this card"}
                  </button>
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask the seller a question…"
                      rows={2}
                      className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !message.trim()}
                      className="w-full py-3 rounded-full bg-foreground/10 hover:bg-foreground/20 font-medium text-sm transition-colors disabled:opacity-40"
                    >
                      {sendingMessage ? "Sending…" : messageSent ? "Update message" : "Message Seller"}
                    </button>
                    {messageSent && !listing.myInquiry?.reply && <p className="text-xs text-foreground/40">Sent — you&apos;ll see the seller&apos;s reply here once they respond.</p>}
                    {listing.myInquiry?.reply && (
                      <div className="p-3 rounded-xl bg-foreground/5 border border-foreground/10 text-sm">
                        <p className="text-xs text-foreground/40 mb-1">Seller replied:</p>
                        {listing.myInquiry.reply}
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          )}

          {listing.status === "RESERVED" && !listing.isOwnListing && <p className="text-sm text-foreground/50">This card is currently reserved by another buyer.</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <span className="w-2 h-2 rounded-full bg-green-400" />;
  if (status === "RESERVED") return <Clock size={12} className="text-yellow-500" />;
  if (status === "SOLD") return <CheckCircle2 size={12} className="text-foreground/40" />;
  return <XCircle size={12} className="text-foreground/30" />;
}

function SellerPanel({ sellerName, trustFacts }: { sellerName: string; trustFacts: SellerTrustFacts }) {
  const memberSince = new Date(trustFacts.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return (
    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UserIcon size={14} className="text-foreground/40" /> {sellerName}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-foreground/50">
        <span>Member since {memberSince}</span>
        <span>{trustFacts.collectionSize} cards in collection</span>
        <span className="flex items-center gap-1">
          <ScanLine size={11} /> {trustFacts.verifiedScans} verified scans
        </span>
        <span>{trustFacts.completedSales} completed sales</span>
        <span className="col-span-2">
          Response rate: {trustFacts.responseRate == null ? "not enough data yet" : `${Math.round(trustFacts.responseRate * 100)}%`}
        </span>
      </div>
    </div>
  );
}
