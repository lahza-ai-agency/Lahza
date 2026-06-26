-- Track subscription/retainer renewals per client, so the admin calendar can
-- surface upcoming renewals alongside meetings and project deliverables.
ALTER TABLE public.clients
  ADD COLUMN subscription_plan TEXT,
  ADD COLUMN billing_cycle TEXT CHECK (billing_cycle IN ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME')),
  ADD COLUMN renewal_date DATE;
