import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { ADMIN_ROLES } from "../pricing/utils";
import { CardImageUploader } from "./card-image-uploader";

export const dynamic = "force-dynamic";

export default async function CardImagesAdminPage() {
  const user = await requireUser();
  // Same 404-not-403 role gate as /admin/pricing.
  if (!ADMIN_ROLES.includes(user.role)) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 pb-32 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">Card Images</h1>
        <p className="text-foreground/50 mt-2">
          Search for a card and upload our own photo of it. Stored in Cloudflare R2 and becomes that card&apos;s
          display image immediately. Pokémon and Yu-Gi-Oh! already have good official artwork — leave those alone
          unless you mean to replace them.
        </p>
      </div>

      <CardImageUploader />
    </div>
  );
}
