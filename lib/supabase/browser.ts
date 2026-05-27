// FEATURE (Auth): Browser-side Supabase client for user authentication.
//
// Uses the public anon key (safe to expose). This is what the sign-in page uses
// to start the Google OAuth flow. It is SEPARATE from lib/db/client.ts, which is
// a privileged service-role client used for server-side data access.
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
