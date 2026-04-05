

-- ─── 3. einwilligungen (GDPR consent log) ────────────────────────────────────
-- Could store proof of user consent (AGB, Datenschutz, marketing).
-- Not currently implemented in any API route. Low priority.
-- Zero policies → service_role only until implemented.
ALTER TABLE einwilligungen ENABLE ROW LEVEL SECURITY;


