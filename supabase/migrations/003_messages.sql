-- FIX #5: Create the `messages` table for inbound/outbound WhatsApp chat history.
--
-- The Meta webhook (app/api/webhooks/meta/route.ts) tries to INSERT incoming
-- customer replies here, and the Chats page (via app/api/messages/route.ts)
-- reads from here. The table was never created, so inbound replies were caught
-- by a try/catch and silently dropped, and the inbox always showed mock data.
--
-- Column notes:
--   sender  -> 'them' for messages received from a contact,
--              'me'   for messages sent by the business.
--              (The webhook writes 'them'; the chat reader understands both.)
--   read    -> used by /api/messages to compute the unread badge count.

CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name  TEXT,
  text          TEXT NOT NULL,
  sender        TEXT NOT NULL DEFAULT 'them' CHECK (sender IN ('me', 'them')),
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of a business's conversation history, newest activity first.
CREATE INDEX IF NOT EXISTS idx_messages_business_contact
  ON messages (business_id, contact_phone, created_at DESC);
