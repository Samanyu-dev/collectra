"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    // This project requires email confirmation (mailer_autoconfirm is off), so
    // signUp() never returns an active session directly — the user has to click
    // the confirmation link first, which is what actually establishes it.
    if (!data.session) {
      setAwaitingConfirmation(true);
      setSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <div className="text-center space-y-4 p-8 rounded-3xl bg-foreground/5 border border-foreground/10">
        <MailCheck size={32} className="text-primary mx-auto" />
        <h2 className="text-lg font-display font-bold">Check your inbox</h2>
        <p className="text-sm text-foreground/50">
          We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Click it to
          finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-mono uppercase tracking-widest text-foreground/50">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-mono uppercase tracking-widest text-foreground/50">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          placeholder="At least 8 characters"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <UserPlus size={16} /> {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
