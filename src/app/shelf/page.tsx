import { requireUser } from "@/lib/auth/session";
import { getCollectionWorkspace } from "@/lib/collection/workspace";
import { ShelfClient } from "./shelf-client";

export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const currentUser = await requireUser();
  const workspace = await getCollectionWorkspace(currentUser.id);

  if (workspace.overview.totalCards === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Your Collection is empty</h1>
          <p className="text-foreground/50 mb-8">Start collecting to build your vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 pb-48">
      <div className="pt-32 px-6 md:px-12 max-w-[1600px] mx-auto">
        <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-8">My Collection</h1>
        <ShelfClient workspace={workspace} />
      </div>
    </div>
  );
}
