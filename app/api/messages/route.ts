import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

// NOTE: This requires a "messages" table in Supabase with columns:
// id, business_id, contact_phone, contact_name, text, sender ("me" | "them"), created_at
// If the table doesn't exist yet, it gracefully falls back to mock data.

export async function GET() {
  const userId = "dev-user";

  const { data: business } = await supabase
    .from("businesses")
    .select("id, connection_status")
    .eq("user_id", userId)
    .single();

  const isConnected = business?.connection_status === "connected";

  // Try to fetch real messages from DB
  try {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("business_id", business?.id)
      .order("created_at", { ascending: true });

    if (messages && messages.length > 0) {
      // Group by contact
      const conversations: Record<string, any> = {};
      for (const m of messages) {
        const key = m.contact_phone;
        if (!conversations[key]) {
          conversations[key] = {
            id: key,
            name: m.contact_name || key,
            phone: key,
            lastMessage: m.text,
            lastTime: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            unread: m.sender === "them" && !m.read ? 1 : 0,
            messages: [],
          };
        }
        conversations[key].messages.push({
          id: m.id,
          text: m.text,
          sender: m.sender,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        conversations[key].lastMessage = m.text;
      }

      return NextResponse.json({
        connected: isConnected,
        conversations: Object.values(conversations),
      });
    }
  } catch {
    // Table likely doesn't exist yet — fall through to mock data
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
