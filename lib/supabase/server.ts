// FEATURE (Auth): Server-side, cookie-aware Supabase client.
//
// Reads/writes the auth session from cookies so server components and route
// handlers know WHO is logged in. Uses the public anon key. This is used only
// to identify the user; privileged DB writes still go through the service-role
// client in lib/db/client.ts.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  // In Next 16 `cookies()` is async.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a pure route-handler/server-component context cookie writes can
          // throw; the middleware is responsible for refreshing the session, so
          // we swallow errors here.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* no-op: session refresh handled in middleware */
          }
        },
      },
    }
  );
}
