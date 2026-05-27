// FEATURE (Auth): OAuth callback handler.
//
// Google (via Supabase) redirects here with a `code`. We exchange it for a
// session (which sets the auth cookies), then send the user to the dashboard.
// Excluded from the auth middleware so it can run before a session exists.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
