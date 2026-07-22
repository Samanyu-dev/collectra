'use client';

import './globals.css';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-2xl font-bold">Collectra hit a critical error</h1>
          <p className="text-foreground/50">
            The whole app failed to render. This has been logged — try reloading the page.
          </p>
          {error.digest && <p className="text-foreground/30 text-xs font-mono">Reference: {error.digest}</p>}
          <button
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
