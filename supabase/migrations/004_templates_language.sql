-- FIX (campaign send): Add a `language` column to templates.
--
-- Meta identifies an approved template by BOTH its name AND its language code
-- (e.g. "hello_world" exists as the "en_US" translation). The worker previously
-- hard-coded "en", so Meta replied:
--   (#132001) Template name does not exist in the translation
-- because there is no "en" translation of hello_world — only "en_US".
--
-- We store the language per template so each can use its correct code.
-- Default 'en_US' matches Meta's built-in sample templates (hello_world, etc.).
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en_US';
