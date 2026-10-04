-- Row Level Security on every table in the public schema.
--
-- The API connects to PostgreSQL directly with the database owner role (Prisma), which is not subject to RLS,
-- so the app is unaffected. Supabase also exposes this schema over its public REST/GraphQL API to the
-- `anon` and `authenticated` roles; with RLS on and no policies those roles can read and write nothing.
-- That is intended: all access goes through the NestJS API, which enforces ownership itself.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Belt and braces: also remove the table privileges Supabase grants to its public API roles.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
  END IF;
END $$;
