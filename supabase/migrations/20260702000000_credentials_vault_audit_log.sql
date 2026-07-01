-- Credentials Vault + Audit Log.
--
-- Secrets are NEVER stored in a plain public.* column. They're stored using
-- Supabase's built-in Vault extension (pgsodium-backed authenticated
-- encryption) — this migration only creates a metadata table that points at
-- an encrypted row in vault.secrets by id. The app never implements its own
-- crypto; decrypting a value always goes through vault.decrypted_secrets,
-- which is only reachable with the service_role key (server-side only, never
-- shipped to the client bundle) — see src/lib/vault.functions.ts.
--
-- Every create / update / reveal / delete is written to audit_logs, so
-- there's a permanent record of who looked at what and when.

CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE TYPE public.credential_category AS ENUM (
  'AI_KEYS',
  'CLOUD_HOSTING',
  'PAYMENTS',
  'COMMUNICATIONS',
  'SOCIAL_ACCOUNTS',
  'DOMAINS',
  'DATABASES',
  'OTHER'
);

CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  service TEXT,
  category public.credential_category NOT NULL DEFAULT 'OTHER',
  notes TEXT,
  -- Points at the encrypted row in vault.secrets — the actual secret value
  -- never lives in this table.
  vault_secret_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_rotated_at TIMESTAMPTZ
);

ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Only Admins / Super Admins can see the vault exists at all. Team members
-- and clients get nothing back — not even metadata — via RLS.
CREATE POLICY "Admins manage credentials" ON public.credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'SUPER_ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE TRIGGER trg_credentials_updated BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generic audit trail. Written exclusively by server functions using the
-- service-role client (application code never lets a user forge an entry).
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'SUPER_ADMIN'));
-- No INSERT/UPDATE/DELETE policy for `authenticated` on purpose — rows are
-- only ever written by the service-role client from server functions, which
-- bypasses RLS entirely. Regular users (including admins) can never edit or
-- delete an audit entry through the API.

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs (resource_type, resource_id);
