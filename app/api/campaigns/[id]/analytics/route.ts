import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = "dev-user";

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (error || !campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: contacts, error: contactsError } = await supabase
    .from("campaign_contacts")
    .select("*, contacts(name, phone_number)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true });

  if (contactsError) return NextResponse.json({ error: contactsError.message }, { status: 500 });

  return NextResponse.json({
    campaign,
    contacts: (contacts || []).map((c: any) => ({
      ...c,
      name: c.contacts?.name,
      phone_number: c.contacts?.phone_number,
      contacts: undefined,
    })),
  });
}
