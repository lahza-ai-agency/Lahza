-- Clients need to see meetings scheduled with their own account from their portal.
CREATE POLICY "Clients read own meetings" ON public.meetings
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
