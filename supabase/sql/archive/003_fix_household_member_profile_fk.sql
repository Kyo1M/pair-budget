-- Ensure household_members.user_id references profiles.id so Supabase can expose the relationship
ALTER TABLE public.household_members
  DROP CONSTRAINT IF EXISTS household_members_user_id_fkey;

ALTER TABLE public.household_members
  ADD CONSTRAINT household_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
