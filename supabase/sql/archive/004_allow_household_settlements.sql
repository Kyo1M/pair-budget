-- Allow settlements to reference the household instead of a specific member
ALTER TABLE public.settlements
  ALTER COLUMN from_user_id DROP NOT NULL,
  ALTER COLUMN to_user_id DROP NOT NULL;

ALTER TABLE public.settlements
  DROP CONSTRAINT IF EXISTS settlements_from_user_id_fkey,
  DROP CONSTRAINT IF EXISTS settlements_to_user_id_fkey;

ALTER TABLE public.settlements
  ADD CONSTRAINT settlements_from_user_id_fkey
    FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT settlements_to_user_id_fkey
    FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.settlements
  DROP CONSTRAINT IF EXISTS settlements_participants_check,
  ADD CONSTRAINT settlements_participants_check
    CHECK (from_user_id IS NOT NULL OR to_user_id IS NOT NULL);

-- Refresh balances function to ignore household-side NULL values
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
