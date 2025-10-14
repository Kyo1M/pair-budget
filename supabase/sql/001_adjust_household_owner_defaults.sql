-- 001_adjust_household_owner_defaults.sql
-- Ensure households always record the authenticated user as owner.

BEGIN;

ALTER TABLE public.households
  ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.set_household_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_household_owner_before_insert ON public.households;
CREATE TRIGGER set_household_owner_before_insert
  BEFORE INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_household_owner_id();

COMMIT;
