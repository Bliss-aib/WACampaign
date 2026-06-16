-- FEATURE: Onboarding flow for new businesses.
-- Tracks whether a business has completed the guided setup
-- (Connect WhatsApp → Add contacts → Create template → Send test campaign).
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_businesses_onboarding_completed
ON businesses(onboarding_completed);
