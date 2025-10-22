-- 002_update_household_insert_policy.sql
-- Allow inserts before triggers populate owner_user_id while keeping RLS enforced.

BEGIN;

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;
