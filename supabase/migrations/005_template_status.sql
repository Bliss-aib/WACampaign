-- FEATURE: Meta Template Management — track each template's approval lifecycle.
--
-- WhatsApp template messages can only send templates that exist & are APPROVED on
-- Meta's side. The app previously stored templates only locally, so the message
-- body was never actually submitted to Meta. These columns let us submit templates
-- for approval and reflect their real status in the WACampaign UI.
--
--   meta_template_id    -> Meta's template id, returned on submission
--   meta_template_name  -> the normalized (lowercase_underscore) name Meta knows it
--                          by; sends must use this exact name
--   status              -> local lifecycle:
--                            'local'    = created here, not yet submitted
--                            'pending'  = submitted, awaiting Meta review
--                            'approved' = ready to use in campaigns
--                            'rejected' = Meta rejected (see rejection_reason)
--                            'paused'   = Meta paused (quality)
--                            'disabled' = Meta disabled
--   rejection_reason    -> human-readable reason shown in the UI when rejected
--   submitted_at        -> when we submitted it to Meta

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS meta_template_id   TEXT,
  ADD COLUMN IF NOT EXISTS meta_template_name TEXT,
  ADD COLUMN IF NOT EXISTS status             TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMPTZ;

-- Constrain status to known values (drop first so the migration is re-runnable).
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_status_check;
ALTER TABLE templates
  ADD CONSTRAINT templates_status_check
  CHECK (status IN ('local', 'pending', 'approved', 'rejected', 'paused', 'disabled'));

-- The built-in "hello_world" sample already exists & is approved on every test
-- WABA, so mark any existing local copy as approved to keep it working.
UPDATE templates
  SET status = 'approved', meta_template_name = 'hello_world'
  WHERE name = 'hello_world' AND status = 'local';
