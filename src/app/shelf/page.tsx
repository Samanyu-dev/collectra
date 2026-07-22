import { DisplayCase } from "@/components/ui/display-case";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const currentUser = await requireUser();
  const userRaw = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      instances: {
        include: {
          certification: true,
          variant: {
            include: {
              card: {
                include: {
                  set: {
                    include: { series: { include: { franchise: true } } }
                  }
                }
              },
              printing: true,
              parallel: true,
              currentPrice: true,
            }
          }
        },
        orderBy: {
          purchaseDate: 'desc'
        }
      }
    }
  });

  const cardImages = userRaw
    ? await getImagesForEntities("Card", userRaw.instances.map((i) => i.variant.card.id))
    : new Map();
  const user = userRaw && {
    ...userRaw,
    instances: userRaw.instances.map((i) => ({
      ...i,
      variant: { ...i.variant, card: { ...i.variant.card, images: cardImages.get(i.variant.card.id) ?? [] } },
    })),
  };

  if (!user || user.instances.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Your Shelf is empty</h1>
          <p className="text-foreground/50 mb-8">Start collecting to build your display case.</p>
        </div>
      </div>
    );
  }

  // Calculate total estimated value
  const totalValue = user.instances.reduce((sum, instance) => {
    const currentPrice = instance.variant.currentPrice?.marketPriceUsd ?? instance.purchasePrice ?? 0;
    return sum + currentPrice;
  }, 0);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 pb-48">
      
      {/* Header */}
      <div className="pt-32 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-2">My Shelf</h1>
            <p className="text-foreground/50 font-mono text-sm uppercase tracking-widest">
              {user.instances.length} Cards • Collection Value: <span className="text-green-400 font-bold">${totalValue.toFixed(2)}</span>
            </p>
          </div>
          
          <div className="flex gap-6 bg-foreground/5 p-4 rounded-2xl border border-foreground/10">
            <div>
              <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-1">Graded</p>
              <p className="text-xl font-bold">{user.instances.filter(i => i.isGraded).length}</p>
            </div>
            <div>
              <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-1">Raw</p>
              <p className="text-xl font-bold">{user.instances.filter(i => !i.isGraded).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Display Case Client Component */}
      <DisplayCase instances={user.instances} />
      
    </div>
  );
}
