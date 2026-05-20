import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function GET() {
  const userId = "dev-user";

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
  const userId = "dev-user";

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { name, body, variables, imageUrls } = await req.json();

  const { data, error } = await supabase
    .from("templates")
    .insert({ business_id: businessId, name, body, variables: variables || [], image_urls: imageUrls || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
