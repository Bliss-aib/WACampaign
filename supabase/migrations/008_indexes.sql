-- FIX (L4): add indexes for common query patterns that lacked one.
--
-- The dashboard filters templates by business + approval status (templates list,
-- and the worker's "only approved" check), and queries messages by business +
-- contact for the chat threads. These composite indexes back those lookups.
-- (campaigns(status) and most campaign_contacts/contacts indexes already exist
-- from 001_schema.sql.)

CREATE INDEX IF NOT EXISTS idx_templates_business_status
  ON templates (business_id, status);

CREATE INDEX IF NOT EXISTS idx_templates_meta_template_name
  ON templates (meta_template_name);
