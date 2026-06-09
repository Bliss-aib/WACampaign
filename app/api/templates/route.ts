import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
// FEATURE: Meta Template Management — auto-submit new templates to Meta.
import { submitTemplate } from "@/lib/submit-template";
import { templateCreateSchema } from "@/lib/validation";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ templates: [] });

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data || [] });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // FIX (H9): validate the body (was destructured untyped).
  const parsed = templateCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, body, variables, imageUrls } = parsed.data;

  const { data, error } = await supabase
    .from("templates")
    .insert({ business_id: businessId, name, body, variables: variables || [], image_urls: imageUrls || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // FEATURE: Auto-submit the new template to Meta for approval. This is what
  // makes the user's message body actually deliverable. We don't fail creation
  // if submission fails (e.g. WhatsApp not connected) — the template stays in
  // 'local' status and can be submitted later via the "Submit to Meta" button.
  const submission = await submitTemplate(data.id, businessId);

  // Return the freshly-updated row so the UI reflects the new status immediately.
  const { data: updated } = await supabase
    .from("templates")
    .select("*")
    .eq("id", data.id)
    .single();

  return NextResponse.json({ template: updated || data, submission });
}
