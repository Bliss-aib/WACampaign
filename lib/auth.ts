// FEATURE (Auth): Central helpers for resolving the current user and their business.
//
// AUTH_ENABLED gate:
//   - false (default): the app behaves exactly as before authentication existed —
//     every request acts as the legacy "dev-user". This keeps local testing working
//     while Google credentials are not yet configured.
//   - true: the real signed-in Google user is used; unauthenticated requests get null.
//
// This single switch lets us ship all the auth code without breaking the running app,
// then flip it on once Google OAuth is configured.

import { supabase } from "./db/client";
import { createSupabaseServerClient } from "./supabase/server";

const LEGACY_DEV_USER = "dev-user";

export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === "true";
}

/**
 * Returns the current user's id, or null if not authenticated.
 * When AUTH_ENABLED is false, always returns the legacy "dev-user".
 */
export async function getUserId(): Promise<string | null> {
  if (!isAuthEnabled()) return LEGACY_DEV_USER;

  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Returns the business id for a user, creating one if needed.
 *
 * First-login claim: if this user has no business yet but the legacy "dev-user"
 * business still exists (unclaimed), we reassign it to this user so the existing
 * test data (approved templates, contacts, campaigns) carries over to the first
 * real Gmail login. Subsequent users get their own fresh business — giving true
 * multi-tenant separation for testing with spare Gmail accounts.
 *
 * Returns null only if a brand-new business could not be created.
 */
export async function getOrCreateBusinessId(userId: string): Promise<string | null> {
  // 1. Already has a business?
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (existing?.id) return existing.id;

  // The legacy user never needs claiming/creation beyond what already exists.
  if (userId === LEGACY_DEV_USER) return null;

  // 2. Claim the unclaimed legacy dev-user business for the FIRST real login.
  const { data: legacy } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", LEGACY_DEV_USER)
    .single();
  if (legacy?.id) {
    const { data: claimed } = await supabase
      .from("businesses")
      .update({ user_id: userId })
      .eq("id", legacy.id)
      .select("id")
      .single();
    if (claimed?.id) return claimed.id;
  }

  // 3. Otherwise create a fresh, empty business for this user.
  const { data: created } = await supabase
    .from("businesses")
    .insert({ user_id: userId, name: "My Business" })
    .select("id")
    .single();
  return created?.id ?? null;
}
