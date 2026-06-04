// FEATURE (Delete account): permanently delete the signed-in user's account.
//
// Order of operations:
//   1. Best-effort: delete the business's submitted templates from Meta (so they
//      don't linger on the client's WABA).
//   2. Delete the business row → ON DELETE CASCADE removes templates, contacts,
//      campaigns, campaign_contacts, daily_usage, and messages. This also
//      destroys our stored (encrypted) Meta access token.
//   3. Best-effort: delete the Supabase auth user so the login is gone too.
//
// Note on "revoking the Meta API token": the token types used here (sample-app
// temporary tokens / system-user tokens) cannot be reliably revoked via the
// Graph API by the holder. Deleting the business row destroys OUR copy of the
// token; fully invalidating it is a manual step in the Meta App dashboard
// (System Users → revoke/regenerate). We surface this in the response.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, isAuthEnabled } from "@/lib/auth";
import { decrypt } from "@/lib/encrypt";
import { deleteWhatsAppTemplate } from "@/lib/meta";

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load the business (if any) so we can clean up Meta + cascade-delete its data.
  const { data: business } = await supabase
    .from("businesses")
    .select("id, waba_id, access_token")
    .eq("user_id", userId)
    .single();

  let metaTemplatesDeleted = 0;
  const metaErrors: string[] = [];

  if (business) {
    // 1. Best-effort: delete submitted templates from Meta.
    if (business.waba_id && business.access_token) {
      const { data: templates } = await supabase
        .from("templates")
        .select("meta_template_name")
        .eq("business_id", business.id)
        .not("meta_template_name", "is", null);

      if (templates && templates.length > 0) {
        let token = "";
        try {
          token = decrypt(business.access_token);
        } catch {
          metaErrors.push("Could not decrypt access token; skipped Meta template deletion.");
        }
        if (token) {
          // De-dupe names (a template can have multiple language rows).
          const names = Array.from(
            new Set(templates.map((t: any) => t.meta_template_name).filter(Boolean))
          );
          for (const name of names) {
            const res = await deleteWhatsAppTemplate(token, business.waba_id, name as string);
            if (res.ok) metaTemplatesDeleted++;
            else metaErrors.push(`Meta template "${name}": ${res.data?.error?.message || "delete failed"}`);
          }
        }
      }
    }

    // 2a. Delete campaigns first. campaigns.template_id is ON DELETE RESTRICT, so
    //     if we deleted the business directly, Postgres could try to cascade-delete
    //     a template while a campaign still references it and fail. Deleting
    //     campaigns up front (cascades campaign_contacts) removes that dependency.
    const { error: campErr } = await supabase.from("campaigns").delete().eq("business_id", business.id);
    if (campErr) {
      return NextResponse.json({ error: `Failed to delete campaigns: ${campErr.message}` }, { status: 500 });
    }

    // 2b. Delete the business row — cascades templates, contacts, daily_usage,
    //     and messages, and destroys our stored (encrypted) Meta token.
    const { error: delError } = await supabase.from("businesses").delete().eq("id", business.id);
    if (delError) {
      return NextResponse.json({ error: `Failed to delete account data: ${delError.message}` }, { status: 500 });
    }
  }

  // 3. Best-effort: delete the Supabase auth user (only when real auth is on and
  //    the id is a genuine auth UUID, not the legacy "dev-user").
  if (isAuthEnabled() && userId !== "dev-user") {
    try {
      const { error: authErr } = await (supabase as any).auth.admin.deleteUser(userId);
      if (authErr) metaErrors.push(`Auth user deletion: ${authErr.message}`);
    } catch (e: any) {
      metaErrors.push(`Auth user deletion: ${e?.message || "failed"}`);
    }
  }

  return NextResponse.json({
    success: true,
    metaTemplatesDeleted,
    // Non-fatal issues (e.g. a Meta template that couldn't be deleted). The
    // account data itself is gone regardless.
    warnings: metaErrors,
    // Reminder for the UI: the Meta token must be revoked manually if desired.
    note: "Account data deleted. To fully revoke the WhatsApp API token, regenerate/revoke it in the Meta App dashboard.",
  });
}
