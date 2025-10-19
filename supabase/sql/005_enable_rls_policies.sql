-- 005_enable_rls_policies.sql
-- Enable row level security across core PairBudget tables.
-- Run in Supabase SQL editor (transactional). Safe to re-run.

BEGIN;

----------------------------
-- 1. Enable Row Level Security
----------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

----------------------------
-- 2. Helper Functions
----------------------------

-- Check if the current user belongs to the target household
CREATE OR REPLACE FUNCTION public.is_household_member(target_household UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = target_household
      AND hm.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_household_member(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_household_member(UUID) TO authenticated, service_role;

-- Check if the current user owns the target household
CREATE OR REPLACE FUNCTION public.is_household_owner(target_household UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = target_household
      AND h.owner_user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_household_owner(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_household_owner(UUID) TO authenticated, service_role;

-- Household balance aggregation (ensures caller is a household member)
CREATE OR REPLACE FUNCTION public.get_household_balances(target_household UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  balance_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH advance_payments AS (
    SELECT
      t.payer_user_id AS user_id,
      COALESCE(SUM(t.amount), 0) AS paid_amount
    FROM public.transactions t
    WHERE t.household_id = target_household
      AND t.type = 'advance'
      AND t.payer_user_id IS NOT NULL
    GROUP BY t.payer_user_id
  ),
  advance_debts AS (
    SELECT
      t.advance_to_user_id AS user_id,
      COALESCE(SUM(t.amount), 0) AS debt_amount
    FROM public.transactions t
    WHERE t.household_id = target_household
      AND t.type = 'advance'
      AND t.advance_to_user_id IS NOT NULL
    GROUP BY t.advance_to_user_id
  ),
  settlement_paid AS (
    SELECT
      s.from_user_id AS user_id,
      COALESCE(SUM(s.amount), 0) AS paid_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
      AND s.from_user_id IS NOT NULL
    GROUP BY s.from_user_id
  ),
  settlement_received AS (
    SELECT
      s.to_user_id AS user_id,
      COALESCE(SUM(s.amount), 0) AS received_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
      AND s.to_user_id IS NOT NULL
    GROUP BY s.to_user_id
  )
  SELECT
    hm.user_id,
    p.name AS user_name,
    (
      COALESCE(ap.paid_amount, 0) -
      COALESCE(ad.debt_amount, 0) -
      COALESCE(sr.received_amount, 0) +
      COALESCE(sp.paid_amount, 0)
    ) AS balance_amount
  FROM public.household_members hm
  LEFT JOIN public.profiles p ON p.id = hm.user_id
  LEFT JOIN advance_payments ap ON ap.user_id = hm.user_id
  LEFT JOIN advance_debts ad ON ad.user_id = hm.user_id
  LEFT JOIN settlement_paid sp ON sp.user_id = hm.user_id
  LEFT JOIN settlement_received sr ON sr.user_id = hm.user_id
  WHERE hm.household_id = target_household
  ORDER BY hm.joined_at;
END;
$$;

ALTER FUNCTION public.get_household_balances(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_household_balances(UUID) TO authenticated, service_role;

----------------------------
-- 3. RLS Policies
----------------------------

-- profiles
DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- households
DROP POLICY IF EXISTS "Household members can view household" ON public.households;
CREATE POLICY "Household members can view household" ON public.households
  FOR SELECT
  USING (public.is_household_member(households.id));

DROP POLICY IF EXISTS "Household owners can view household" ON public.households;
CREATE POLICY "Household owners can view household" ON public.households
  FOR SELECT
  USING (public.is_household_owner(households.id));

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Household owners can update household" ON public.households;
CREATE POLICY "Household owners can update household" ON public.households
  FOR UPDATE
  USING (public.is_household_owner(households.id))
  WITH CHECK (public.is_household_owner(households.id));

-- household_members
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
CREATE POLICY "Household members can view members" ON public.household_members
  FOR SELECT
  USING (public.is_household_member(household_members.household_id));

DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;
CREATE POLICY "Household owners can add members" ON public.household_members
  FOR INSERT
  WITH CHECK (
    public.is_household_owner(household_members.household_id)
    OR auth.uid() = household_members.user_id
  );

DROP POLICY IF EXISTS "Household owners can update members" ON public.household_members;
CREATE POLICY "Household owners can update members" ON public.household_members
  FOR UPDATE
  USING (public.is_household_owner(household_members.household_id))
  WITH CHECK (public.is_household_owner(household_members.household_id));

DROP POLICY IF EXISTS "Household owners can remove members" ON public.household_members;
CREATE POLICY "Household owners can remove members" ON public.household_members
  FOR DELETE
  USING (public.is_household_owner(household_members.household_id));

-- household_join_codes
DROP POLICY IF EXISTS "Household owners manage join codes" ON public.household_join_codes;
CREATE POLICY "Household owners manage join codes" ON public.household_join_codes
  FOR ALL
  USING (public.is_household_owner(household_join_codes.household_id))
  WITH CHECK (public.is_household_owner(household_join_codes.household_id));

DROP POLICY IF EXISTS "Authenticated users can use active join codes" ON public.household_join_codes;
CREATE POLICY "Authenticated users can use active join codes" ON public.household_join_codes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND household_join_codes.status = 'active'
    AND household_join_codes.expires_at > NOW()
  );

DROP POLICY IF EXISTS "Users can consume join codes" ON public.household_join_codes;
CREATE POLICY "Users can consume join codes" ON public.household_join_codes
  FOR UPDATE
  TO authenticated
  USING (
    household_join_codes.status = 'active'
    AND household_join_codes.expires_at > NOW()
  )
  WITH CHECK (
    auth.uid() = household_join_codes.used_by
    AND household_join_codes.status = 'used'
  );

-- transactions
DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
CREATE POLICY "Household members can view transactions" ON public.transactions
  FOR SELECT
  USING (public.is_household_member(transactions.household_id));

DROP POLICY IF EXISTS "Household members can insert transactions" ON public.transactions;
CREATE POLICY "Household members can insert transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (
    public.is_household_member(transactions.household_id)
    AND auth.uid() = transactions.created_by
  );

DROP POLICY IF EXISTS "Creators can update transactions" ON public.transactions;
CREATE POLICY "Creators can update transactions" ON public.transactions
  FOR UPDATE
  USING (auth.uid() = transactions.created_by)
  WITH CHECK (auth.uid() = transactions.created_by);

DROP POLICY IF EXISTS "Creators can delete transactions" ON public.transactions;
CREATE POLICY "Creators can delete transactions" ON public.transactions
  FOR DELETE
  USING (auth.uid() = transactions.created_by);

-- settlements
DROP POLICY IF EXISTS "Household members can view settlements" ON public.settlements;
CREATE POLICY "Household members can view settlements" ON public.settlements
  FOR SELECT
  USING (public.is_household_member(settlements.household_id));

DROP POLICY IF EXISTS "Household members can insert settlements" ON public.settlements;
CREATE POLICY "Household members can insert settlements" ON public.settlements
  FOR INSERT
  WITH CHECK (
    public.is_household_member(settlements.household_id)
    AND auth.uid() = settlements.created_by
  );

DROP POLICY IF EXISTS "Creators can delete settlements" ON public.settlements;
CREATE POLICY "Creators can delete settlements" ON public.settlements
  FOR DELETE
  USING (auth.uid() = settlements.created_by);

COMMIT;

----------------------------
-- Rollback Helper (manual)
----------------------------
-- To disable RLS and return to the pre-MVP state, run the statements below.
-- Note: execute outside the transaction above as needed.
--
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.households DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.household_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.household_join_codes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
-- DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
-- DROP POLICY IF EXISTS "Household members can view household" ON public.households;
-- DROP POLICY IF EXISTS "Users can create households" ON public.households;
-- DROP POLICY IF EXISTS "Household owners can update household" ON public.households;
-- DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
-- DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;
-- DROP POLICY IF EXISTS "Household owners can update members" ON public.household_members;
-- DROP POLICY IF EXISTS "Household owners can remove members" ON public.household_members;
-- DROP POLICY IF EXISTS "Household owners manage join codes" ON public.household_join_codes;
-- DROP POLICY IF EXISTS "Authenticated users can use active join codes" ON public.household_join_codes;
-- DROP POLICY IF EXISTS "Users can consume join codes" ON public.household_join_codes;
-- DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
-- DROP POLICY IF EXISTS "Household members can insert transactions" ON public.transactions;
-- DROP POLICY IF EXISTS "Creators can update transactions" ON public.transactions;
-- DROP POLICY IF EXISTS "Creators can delete transactions" ON public.transactions;
-- DROP POLICY IF EXISTS "Household members can view settlements" ON public.settlements;
-- DROP POLICY IF EXISTS "Household members can insert settlements" ON public.settlements;
-- DROP POLICY IF EXISTS "Creators can delete settlements" ON public.settlements;
