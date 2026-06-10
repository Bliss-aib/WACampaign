-- Security: enable Row Level Security on all tables.
--
-- The app accesses data exclusively server-side with the service-role key, which
-- BYPASSES RLS — so app behavior is unchanged. With RLS enabled and NO policies,
-- the anon and authenticated roles (the exposed anon key) are denied direct
-- access, closing the hole where anyone with the public anon key could read or
-- modify rows via the Supabase REST API. Auth is handled by Clerk, not Supabase.

ALTER TABLE public.businesses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
