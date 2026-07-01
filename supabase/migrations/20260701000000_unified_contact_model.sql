-- Unify Lead + Client into a single Contact model.
--
-- Every person is now one row in public.clients (the Contact table), moving
-- through a lifecycle via `status` instead of living in two separate tables
-- with two separate identities. This is additive and non-destructive:
--   • public.leads is left in place untouched (kept as a safety backup —
--     not read by the app anymore after this ships). Safe to drop later
--     once you've confirmed everything looks right in the CRM.
--   • Existing rows in public.clients keep their id, so every foreign key
--     that already points at clients.id (projects.client_id, invoices,
--     documents, meetings.client_id, support tickets...) keeps working
--     with zero changes.
--   • Lead rows are copied into public.clients WITH THE SAME id they had in
--     public.leads, so any meeting already linked via meetings.lead_id is
--     backfilled onto meetings.client_id automatically below.

-- 1. Unified lifecycle status
CREATE TYPE public.contact_status AS ENUM (
  'LEAD',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'ACTIVE_CLIENT',
  'INACTIVE_CLIENT',
  'LOST',
  'ARCHIVED'
);

-- 2. Extend clients with the fields leads used to have.
--    Existing client rows default to ACTIVE_CLIENT (they're already real,
--    operating clients) — new contacts created from now on set their own
--    status explicitly (see trigger update below).
ALTER TABLE public.clients
  ADD COLUMN name TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN status public.contact_status NOT NULL DEFAULT 'ACTIVE_CLIENT',
  ADD COLUMN source public.lead_source NOT NULL DEFAULT 'OTHER',
  ADD COLUMN value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Copy every lead into clients, keeping the same id.
INSERT INTO public.clients
  (id, name, company, email, phone, notes, status, source, value, position, owner_id, created_at, updated_at)
SELECT
  l.id,
  l.name,
  l.company,
  l.email,
  l.phone,
  l.notes,
  CASE l.status
    WHEN 'NEW'       THEN 'LEAD'
    WHEN 'CONTACTED' THEN 'LEAD'
    WHEN 'QUALIFIED' THEN 'QUALIFIED'
    WHEN 'PROPOSAL'  THEN 'PROPOSAL_SENT'
    WHEN 'WON'       THEN 'WON'
    WHEN 'LOST'      THEN 'LOST'
  END::public.contact_status,
  l.source,
  l.value,
  l.position,
  l.owner_id,
  l.created_at,
  l.updated_at
FROM public.leads l
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = l.id)
ON CONFLICT (id) DO NOTHING;

-- 4. Any meeting that was linked to a lead now resolves through client_id
--    (same id, just the unified table).
UPDATE public.meetings
SET client_id = lead_id
WHERE lead_id IS NOT NULL AND client_id IS NULL;

-- 5. New contacts created at signup (CLIENT role auto-assign trigger) start
--    life as a LEAD, not an ACTIVE_CLIENT — staff move them along the
--    pipeline as the relationship progresses.
CREATE OR REPLACE FUNCTION public.handle_client_role_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'CLIENT' THEN
    INSERT INTO public.clients (user_id, status)
    VALUES (NEW.user_id, 'LEAD')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Helpful index for pipeline/Kanban queries.
CREATE INDEX IF NOT EXISTS clients_status_idx ON public.clients (status);
