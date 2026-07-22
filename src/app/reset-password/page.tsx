import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

// Reached only via the link in a password-reset email, which lands here with a
// recovery session Supabase's client SDK picks up from the URL automatically —
// not gated by proxy.ts's normal auth check since the visitor isn't "signed in"
// in the usual sense yet, just holding a short-lived recovery token.
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold tracking-tight">Set a new password</h1>
          <p className="text-foreground/50 text-sm">Choose a new password for your account.</p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
