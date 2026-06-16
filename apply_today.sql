-- Run this in your Supabase SQL Editor to apply today's changes.
-- It adds the onboarding tracking column needed for the new onboarding flow.

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_businesses_onboarding_completed
ON businesses(onboarding_completed);

-- Optional: mark existing businesses as already onboarded
-- so current users are not forced through the onboarding flow.
-- UPDATE businesses SET onboarding_completed = true;
