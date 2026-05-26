"use client";

// FEATURE (Auth): Google sign-in.
//
// Starts Supabase's Google OAuth flow. Supabase redirects the user to Google,
// then back to /auth/callback (handled by app/auth/callback/route.ts), which
// exchanges the code for a session and lands the user on /dashboard.
//
// While auth is disabled (testing phase) we keep the old "Go to Dashboard"
// shortcut so the app stays usable without credentials.

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Supabase sends the user back here after Google auth.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, so no further action.
  };

  return (
    <div className="space-y-5 text-center">
      <div>
        <h1 className="text-xl font-semibold text-black">Sign in to WACampaign</h1>
        <p className="mt-1 text-sm text-zinc-500">Use your Google account to continue.</p>
      </div>

      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="mx-auto flex w-full max-w-xs items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        {/* Google "G" logo */}
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {loading ? "Redirecting…" : "Sign in with Google"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!AUTH_ENABLED && (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Authentication is currently disabled for testing. You can{" "}
          <Link href="/dashboard" className="font-medium underline">
            go straight to the dashboard
          </Link>
          .
        </div>
      )}
    </div>
  );
}
