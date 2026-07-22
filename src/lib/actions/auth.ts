"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** "Sign out everywhere" per ADR §11 — invalidates every session for this user, not just this browser. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
