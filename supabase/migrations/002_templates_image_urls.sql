-- FIX #2: Add the missing `image_urls` column to the templates table.
--
-- The API (app/api/templates/route.ts and [id]/route.ts) writes an `image_urls`
-- value on every create/update, but the original schema (001_schema.sql) never
-- defined this column. Every INSERT therefore failed with
-- "column \"image_urls\" does not exist", the frontend silently fell back to
-- in-memory state, and templates vanished on refresh.
--
-- Stored as JSONB because the app saves an array of image strings
-- (base64 data URLs or hosted URLs). Nullable: templates without images store NULL.
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS image_urls JSONB;
