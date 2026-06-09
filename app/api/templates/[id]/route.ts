import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { templateUpdateSchema } from "@/lib/validation";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;
  // FIX (H9): validate the body (was destructured untyped).
  const parsed = templateUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, body, variables, imageUrls } = parsed.data;

  // FEATURE: Editing a template's content invalidates any prior Meta approval —
  // Meta versions templates, so a changed body must be re-submitted. Reset the
  // status to 'local' and clear the old Meta linkage so the UI prompts a resubmit.
  const { data, error } = await supabase
    .from("templates")
    .update({
      name,
      body,
      variables: variables || [],
      image_urls: imageUrls || null,
      status: "local",
      meta_template_id: null,
      meta_template_name: null,
      rejection_reason: null,
      submitted_at: null,
    })
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  // FIX (H4): use .select() so we can tell whether a row was actually deleted
  // (Supabase returns no error for a 0-row delete) and return 404 otherwise.
  const { data, error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id");

  if (error) {
    // FIX #3: Templates referenced by a campaign are protected by a
    // foreign-key constraint (ON DELETE RESTRICT). Postgres returns error
    // code 23503 in that case. Translate the raw DB error into a clear,
    // user-friendly message instead of a generic 500 so the dashboard can
    // explain WHY the delete was blocked.
    if ((error as any).code === "23503") {
      return NextResponse.json(
        { error: "This template is used by one or more campaigns and can't be deleted. Delete those campaigns first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
