// FEATURE (Auth): Session refresh + route protection.
//
// (Next.js 16 renamed the "middleware" file convention to "proxy" — same role:
// runs on the server before a request completes.)
//
// Two responsibilities:
//   1. Keep the Supabase auth session fresh by syncing cookies on every request.
//   2. When AUTH_ENABLED is true, block logged-out visitors from the dashboard
//      and redirect them to /sign-in.
//
// When AUTH_ENABLED is false this is a no-op, so the app stays fully usable
// during testing before Google credentials are configured.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

// Dashboard areas that require a login once auth is enabled.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/campaigns",
  "/contacts",
  "/templates",
  "/chats",
  "/analytics",
  "/settings",
];

export async function proxy(request: NextRequest) {
  // When auth is disabled (testing phase), do nothing — the app behaves exactly
  // as it did before authentication existed. This also avoids any dependency on
  // the Supabase public env vars while testing.
  if (!AUTH_ENABLED) {
    return NextResponse.next({ request });
  }

  // Prepare a response we can attach refreshed cookies to.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (also populates request cookies for downstream handlers).
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on app routes but skip Next internals, static assets, and the OAuth
  // callback (which must process the code before a session exists).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback|api/webhooks).*)"],
};
