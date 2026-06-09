-- Phase 2 — concurrency & data-integrity fixes for the campaign sender.
--
-- Adds:
--   • a 'sending' state to campaign_contacts (FIX C8: in-flight claim so a
--     crashed/retried job can't send the same contact twice),
--   • a 'paused' state to campaigns (FIX H12: daily-limit stop is resumable,
--     not a false 'completed'),
--   • recalc_campaign_counts() (FIX C7: atomic aggregate recompute — replaces the
--     read-all-rows-then-write-in-JS pattern that lost updates under concurrent
--     webhook deliveries),
--   • claim_daily_send() (FIX C9: atomically reserve one daily-send slot, never
--     exceeding the limit even with concurrent workers/jobs).

-- ── Status constraints ─────────────────────────────────────────────────────
ALTER TABLE campaign_contacts DROP CONSTRAINT IF EXISTS campaign_contacts_status_check;
ALTER TABLE campaign_contacts
  ADD CONSTRAINT campaign_contacts_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed', 'paused'));

-- ── FIX C7: atomic campaign aggregate recompute ────────────────────────────
-- A single UPDATE driven by sub-SELECTs is evaluated atomically by Postgres,
-- so concurrent callers can't lose each other's updates.
CREATE OR REPLACE FUNCTION recalc_campaign_counts(p_campaign_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE campaigns c SET
    sent_count = (
      SELECT count(*) FROM campaign_contacts cc
      WHERE cc.campaign_id = p_campaign_id AND cc.status IN ('sent', 'delivered', 'read')
    ),
    delivered_count = (
      SELECT count(*) FROM campaign_contacts cc
      WHERE cc.campaign_id = p_campaign_id AND cc.status IN ('delivered', 'read')
    ),
    read_count = (
      SELECT count(*) FROM campaign_contacts cc
      WHERE cc.campaign_id = p_campaign_id AND cc.status = 'read'
    ),
    failed_count = (
      SELECT count(*) FROM campaign_contacts cc
      WHERE cc.campaign_id = p_campaign_id AND cc.status = 'failed'
    ),
    updated_at = NOW()
  WHERE c.id = p_campaign_id;
$$;

-- ── FIX C9: atomic daily-send reservation ──────────────────────────────────
-- Returns TRUE if a slot was reserved (and increments the counter), FALSE if the
-- business is already at its daily limit. The INSERT ... ON CONFLICT ... WHERE
-- guarantees the check-and-increment happen as one atomic statement, so two
-- concurrent jobs can never both reserve the slot that crosses the limit.
CREATE OR REPLACE FUNCTION claim_daily_send(p_business_id UUID, p_date DATE, p_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO daily_usage (business_id, date, count, updated_at)
  VALUES (p_business_id, p_date, 1, NOW())
  ON CONFLICT (business_id, date)
  DO UPDATE SET count = daily_usage.count + 1, updated_at = NOW()
    WHERE daily_usage.count < p_limit
  RETURNING count INTO v_count;

  -- v_count is NULL when the row existed and the WHERE blocked the update
  -- (i.e. already at the limit).
  RETURN v_count IS NOT NULL;
END;
$$;
