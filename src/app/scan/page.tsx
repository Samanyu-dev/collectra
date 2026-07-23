import { requireUser } from "@/lib/auth/session";
import { ScanClient } from "./scan-client";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireUser();
  return <ScanClient />;
}
