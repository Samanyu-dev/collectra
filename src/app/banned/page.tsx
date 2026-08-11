import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function BannedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.bannedAt) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-3xl font-display font-bold tracking-tight">Account suspended</h1>
        <p className="text-foreground/50 text-sm">
          This account was suspended for repeatedly marking scanned cards as a mismatch and then adding them to the
          collection anyway. If you believe this is a mistake, contact support.
        </p>
      </div>
    </div>
  );
}
