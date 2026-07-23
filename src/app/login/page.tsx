import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That confirmation link is missing its code — try requesting a new one.",
  confirmation_failed: "That confirmation link is invalid or has expired — try requesting a new one.",
};

export default async function LoginPage(props: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const { next, error } = await props.searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold tracking-tight">Welcome back</h1>
          <p className="text-foreground/50 text-sm">Sign in to your Collectra account.</p>
        </div>

        {error && ERROR_MESSAGES[error] && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl" role="alert">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        <LoginForm next={next} />

        <p className="text-center text-sm text-foreground/50">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-foreground font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
