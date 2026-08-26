import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Layers, Sparkles, Clock } from "lucide-react";
import { getPublicProfileData } from "@/lib/intelligence/feed/public-profile";
import { getRarityTier } from "@/lib/collection/classification";
import { getCurrentUser } from "@/lib/auth/session";
import { GuestDockToggle } from "./guest-dock-toggle";

export const dynamic = "force-dynamic";

const RARITY_GLOW: Partial<Record<ReturnType<typeof getRarityTier>, string>> = {
  rare: "rarity-glow-rare",
  epic: "rarity-glow-epic",
  legendary: "rarity-glow-legendary",
  unique: "rarity-glow-unique",
};

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;

  // Never select email here — this route is fully public, no auth.
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, bio: true, avatarUrl: true, isPublic: true, showValuePublicly: true },
  });

  if (!user || !user.isPublic || !user.username) {
    notFound();
  }

  const [data, viewer] = await Promise.all([
    getPublicProfileData({ id: user.id, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl }),
    getCurrentUser(),
  ]);

  return (
    <div className="min-h-screen w-full pb-32">
      <GuestDockToggle hide={!viewer} />
      <div className="max-w-3xl mx-auto px-6 md:px-12 pt-16 md:pt-24 space-y-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-2xl shrink-0 overflow-hidden relative">
            {data.avatarUrl ? (
              <Image src={data.avatarUrl} alt={data.username} fill className="object-cover" />
            ) : (
              (data.name || data.username)[0]?.toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">{data.name || data.username}</h1>
            <p className="text-foreground/50 font-mono text-sm">@{data.username}</p>
            {data.bio && <p className="text-foreground/70 text-sm mt-1 max-w-md">{data.bio}</p>}
          </div>
        </div>

        {data.totalCards === 0 ? (
          <div className="p-12 rounded-3xl border border-foreground/10 border-dashed text-center text-foreground/40">
            No cards tracked yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {user.showValuePublicly && (
                <StatTile
                  label="Collection Value"
                  value={`$${data.portfolioValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  sub={data.valueRange ? `Range $${data.valueRange.low.toFixed(0)}–${data.valueRange.high.toFixed(0)}` : undefined}
                />
              )}
              <StatTile label="Completion" value={data.completionPercent != null ? `${data.completionPercent.toFixed(0)}%` : "—"} />
              <StatTile label="Unique Cards" value={data.uniqueCards.toLocaleString()} />
              <StatTile label="Favorite Franchise" value={data.favoriteFranchise?.name ?? "—"} sub={data.favoriteFranchise ? `${data.favoriteFranchise.cardCount} cards` : undefined} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.rarestPull && (
                <PullCard
                  icon={Sparkles}
                  label="Rarest Pull"
                  cardId={data.rarestPull.cardId}
                  cardName={data.rarestPull.cardName}
                  setName={data.rarestPull.setName}
                  imageUrl={data.rarestPull.imageUrl}
                  glowClass={RARITY_GLOW[data.rarestPull.rarityTier]}
                  foil
                />
              )}
              {data.latestPull && (
                <PullCard
                  icon={Clock}
                  label="Latest Pull"
                  cardId={data.latestPull.cardId}
                  cardName={data.latestPull.cardName}
                  setName={data.latestPull.setName}
                  imageUrl={data.latestPull.imageUrl}
                />
              )}
            </div>
          </>
        )}

        <p className="text-center text-xs text-foreground/30 pt-8 flex items-center justify-center gap-1.5">
          <Layers size={12} /> Powered by Collectra
        </p>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5 rounded-2xl bg-foreground/5 border border-foreground/10">
      <p className="text-[11px] text-foreground/40 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-display font-bold truncate">{value}</p>
      {sub && <p className="text-[11px] text-foreground/40 mt-0.5">{sub}</p>}
    </div>
  );
}

function PullCard({
  icon: Icon,
  label,
  cardId,
  cardName,
  setName,
  imageUrl,
  glowClass,
  foil = false,
}: {
  icon: typeof Sparkles;
  label: string;
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl: string | null;
  glowClass?: string;
  foil?: boolean;
}) {
  return (
    <Link
      href={`/cards/${cardId}`}
      className={`flex items-center gap-4 p-4 rounded-2xl bg-foreground/5 border border-foreground/10 hover:border-foreground/20 transition-colors ${glowClass ?? ""} ${foil ? "foil-frame" : ""}`}
    >
      <div className="w-14 h-20 rounded-lg overflow-hidden bg-foreground/10 shrink-0 relative">
        {imageUrl && <Image src={imageUrl} alt={cardName} fill className="object-cover" />}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] text-foreground/40 uppercase tracking-widest mb-1">
          <Icon size={12} /> {label}
        </p>
        <p className="font-medium truncate">{cardName}</p>
        <p className="text-xs text-foreground/40 truncate">{setName}</p>
      </div>
    </Link>
  );
}
