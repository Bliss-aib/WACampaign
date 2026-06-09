import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { decrypt } from "@/lib/encrypt";
import { sendWhatsAppText } from "@/lib/meta";
import { messageSendSchema } from "@/lib/validation";

// NOTE: This requires a "messages" table in Supabase with columns:
// id, business_id, contact_phone, contact_name, text, sender ("me" | "them"), created_at
// If the table doesn't exist yet, it gracefully falls back to mock data.

// Format a timestamp into a short "10:30 AM"-style label for the chat UI.
function fmtTime(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const { data: business } = await supabase
    .from("businesses")
    .select("id, connection_status")
    .eq("user_id", userId)
    .single();

  const isConnected = business?.connection_status === "connected";

  // Build conversations keyed by contact phone, merging two sources:
  //   1. Outbound campaign messages we SENT (campaign_contacts) — gives us the
  //      list of contacts that received a message plus its delivery/read status.
  //   2. Inbound replies (messages table) — gives us what contacts wrote back.
  try {
    const conversations: Record<string, any> = {};
    const ensure = (phone: string, name?: string) => {
      if (!conversations[phone]) {
        conversations[phone] = {
          id: phone,
          name: name || phone,
          phone,
          lastMessage: "",
          lastTime: "",
          unread: 0,
          messages: [] as any[],
        };
      } else if (name && conversations[phone].name === phone) {
        conversations[phone].name = name; // upgrade phone -> real name when known
      }
      return conversations[phone];
    };

    // ── 1. Outbound: campaign messages that actually went out ──
    // status beyond 'pending' means it was sent (sent/delivered/read) or failed.
    const { data: sentRows } = await supabase
      .from("campaign_contacts")
      .select("id, status, sent_at, created_at, contacts(name, phone_number), campaigns!inner(business_id, templates(body))")
      .eq("campaigns.business_id", business?.id)
      .in("status", ["sent", "delivered", "read", "failed"]);

    for (const row of (sentRows as any[]) || []) {
      const contact = row.contacts;
      if (!contact?.phone_number) continue;
      const conv = ensure(contact.phone_number, contact.name);
      const ts = row.sent_at || row.created_at;
      conv.messages.push({
        id: `cc-${row.id}`,
        text: row.campaigns?.templates?.body || "Campaign message",
        sender: "me",
        status: row.status, // 'sent' | 'delivered' | 'read' | 'failed'
        time: fmtTime(ts),
        _ts: ts,
      });
    }

    // ── 2. Inbound: replies from contacts ──
    const { data: replies } = await supabase
      .from("messages")
      .select("*")
      .eq("business_id", business?.id)
      .order("created_at", { ascending: true });

    for (const m of (replies as any[]) || []) {
      const conv = ensure(m.contact_phone, m.contact_name);
      conv.messages.push({
        id: m.id,
        text: m.text,
        sender: m.sender, // 'them' (or 'me' if outbound ever stored here)
        time: fmtTime(m.created_at),
        _ts: m.created_at,
        read: m.read,
      });
      if (m.sender === "them" && !m.read) conv.unread += 1;
    }

    const list = Object.values(conversations);
    if (list.length > 0) {
      for (const conv of list as any[]) {
        // Order each thread chronologically, then derive the preview fields.
        conv.messages.sort((a: any, b: any) => new Date(a._ts).getTime() - new Date(b._ts).getTime());
        const last = conv.messages[conv.messages.length - 1];
        conv.lastMessage = last?.text || "";
        conv.lastTime = last?.time || "";
        conv.messages.forEach((msg: any) => delete msg._ts); // drop internal sort key
      }
      return NextResponse.json({ connected: isConnected, conversations: list });
    }
    // No real data yet — fall through to demo data below.
  } catch {
    // Tables may be missing in a fresh setup — fall through to mock data.
  }

  // Fallback mock data for demo
  const mockConversations = [
    {
      id: "+14155551234",
      name: "Alice Johnson",
      phone: "+1 415-555-1234",
      lastMessage: "Thanks for the discount code!",
      lastTime: "10:30 AM",
      unread: 2,
      messages: [
        { id: "m1", text: "Hi Alice, check out our summer sale! Get 20% off with code SAVE20.", sender: "me", time: "10:00 AM" },
        { id: "m2", text: "Wow, that sounds great! What items are included?", sender: "them", time: "10:15 AM" },
        { id: "m3", text: "Almost everything in our new collection. The sale ends this Sunday.", sender: "me", time: "10:20 AM" },
        { id: "m4", text: "Thanks for the discount code!", sender: "them", time: "10:30 AM" },
      ],
    },
    {
      id: "+14155555678",
      name: "Bob Smith",
      phone: "+1 415-555-5678",
      lastMessage: "When will my order arrive?",
      lastTime: "Yesterday",
      unread: 0,
      messages: [
        { id: "m1", text: "Hello Bob, your order #12345 has been shipped.", sender: "me", time: "Yesterday" },
        { id: "m2", text: "When will my order arrive?", sender: "them", time: "Yesterday" },
      ],
    },
    {
      id: "+14155559012",
      name: "Charlie Brown",
      phone: "+1 415-555-9012",
      lastMessage: "I booked the appointment for Friday.",
      lastTime: "Tue",
      unread: 1,
      messages: [
        { id: "m1", text: "Hi Charlie, would you like to schedule a call this week?", sender: "me", time: "Tue" },
        { id: "m2", text: "I booked the appointment for Friday.", sender: "them", time: "Tue" },
      ],
    },
    {
      id: "+14155553456",
      name: "Diana Prince",
      phone: "+1 415-555-3456",
      lastMessage: "The event looks amazing, count me in!",
      lastTime: "Mon",
      unread: 0,
      messages: [
        { id: "m1", text: "You're invited to our Grand Opening on May 25th!", sender: "me", time: "Mon" },
        { id: "m2", text: "The event looks amazing, count me in!", sender: "them", time: "Mon" },
      ],
    },
    {
      id: "+14155557890",
      name: "Evan Wright",
      phone: "+1 415-555-7890",
      lastMessage: "Can you send me the new catalog?",
      lastTime: "Sun",
      unread: 0,
      messages: [
        { id: "m1", text: "Hey Evan, our new collection just dropped.", sender: "me", time: "Sun" },
        { id: "m2", text: "Can you send me the new catalog?", sender: "them", time: "Sun" },
      ],
    },
  ];

  return NextResponse.json({
    connected: isConnected,
    conversations: mockConversations,
  });
}

// FEATURE (Chats reply): Send a free-form WhatsApp text to a contact and store
// it as an outbound ('me') message so it appears in the thread.
//
// WhatsApp only allows free-form text inside the 24-hour customer service window
// (within 24h of the contact's last inbound message). Outside it, Meta rejects
// the send — we forward that error to the UI rather than pretending it sent.
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  // FIX (H9): validate the body via schema (replaces the ad-hoc check).
  const parsed = messageSendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Recipient and message text are required.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { to, text } = parsed.data;

  // Load the business's WhatsApp credentials.
  const { data: business } = await supabase
    .from("businesses")
    .select("id, access_token, phone_number_id, connection_status")
    .eq("user_id", userId)
    .single();

  if (!business || business.connection_status !== "connected" || !business.access_token || !business.phone_number_id) {
    return NextResponse.json(
      { error: "WhatsApp is not connected. Connect it in Settings first." },
      { status: 400 }
    );
  }

  // Send via Meta (free-form text).
  const token = decrypt(business.access_token);
  const result = await sendWhatsAppText(token, business.phone_number_id, to, text.trim());

  if (!result.ok) {
    // Surface Meta's reason (e.g. 24h-window / re-engagement error) to the UI.
    const reason =
      result.data?.error?.error_data?.details ||
      result.data?.error?.message ||
      "Failed to send message.";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  // Persist the outbound message so it shows in the thread (sender 'me', read).
  const { error: insertError } = await supabase.from("messages").insert({
    business_id: business.id,
    contact_phone: to,
    text: text.trim(),
    sender: "me",
    read: true,
    created_at: new Date().toISOString(),
  });
  if (insertError) {
    console.error("Sent to Meta but failed to store message:", insertError.message);
  }

  return NextResponse.json({ success: true, messageId: result.data?.messages?.[0]?.id });
}
