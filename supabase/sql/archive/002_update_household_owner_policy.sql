-- 002_update_household_owner_policy.sql
-- 001_create_household_module.sql 適用後の補正スクリプト。
-- households.owner_user_id を常に auth.uid() へ上書きし、INSERT ポリシーを緩和します。

BEGIN;

CREATE OR REPLACE FUNCTION public.set_household_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
