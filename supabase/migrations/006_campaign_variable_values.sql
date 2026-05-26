-- FEATURE (Option A): Campaign-level template variable values.
--
-- A template like "Welcome Message" has variables beyond {{name}}
-- (business, discount, code, link). The worker fills {{name}} from each contact,
-- but had no source for the others and sent empty strings — which Meta rejects
-- with (#131008) "Required parameter is missing".
--
-- This column stores the values to use for the NON-name variables, entered once
-- when the campaign is created and applied to every recipient. Shape is a JSON
-- object, e.g. {"business":"Acme Co","discount":"20%","code":"SAVE20","link":"https://..."}.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS variable_values JSONB NOT NULL DEFAULT '{}';
