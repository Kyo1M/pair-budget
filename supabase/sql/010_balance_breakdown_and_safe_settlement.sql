-- 010_balance_breakdown_and_safe_settlement.sql
-- 立替残高を相手別に分解し、残高を超えない安全な精算RPCを追加する。

BEGIN;

CREATE OR REPLACE FUNCTION public.get_household_balance_breakdown(
  target_household UUID
)
RETURNS TABLE (
  subject_user_id UUID,
  subject_user_name TEXT,
  counterparty_user_id UUID,
  counterparty_user_name TEXT,
  balance_amount NUMERIC,
  is_over_settled BOOLEAN
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
  WITH ledger_entries AS (
    -- 立替をした人は相手から受け取る（プラス）
    SELECT
      t.payer_user_id AS subject_id,
      t.advance_to_user_id AS counterparty_id,
      t.amount AS advance_amount,
      0::NUMERIC AS settlement_amount
    FROM public.transactions t
    WHERE t.household_id = target_household
      AND t.type = 'advance'
      AND t.payer_user_id IS NOT NULL

    UNION ALL

    -- 個人向け立替では、立替先に反対符号の残高を持たせる
    SELECT
      t.advance_to_user_id AS subject_id,
      t.payer_user_id AS counterparty_id,
      -t.amount AS advance_amount,
      0::NUMERIC AS settlement_amount
    FROM public.transactions t
    WHERE t.household_id = target_household
      AND t.type = 'advance'
      AND t.payer_user_id IS NOT NULL
      AND t.advance_to_user_id IS NOT NULL

    UNION ALL

    -- 支払った側は負債が減る（残高へプラス）
    SELECT
      s.from_user_id AS subject_id,
      s.to_user_id AS counterparty_id,
      0::NUMERIC AS advance_amount,
      s.amount AS settlement_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
      AND s.from_user_id IS NOT NULL

    UNION ALL

    -- 受け取った側は債権が減る（残高へマイナス）
    SELECT
      s.to_user_id AS subject_id,
      s.from_user_id AS counterparty_id,
      0::NUMERIC AS advance_amount,
      -s.amount AS settlement_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
      AND s.to_user_id IS NOT NULL
  ), aggregated AS (
    SELECT
      le.subject_id,
      le.counterparty_id,
      SUM(le.advance_amount) AS advance_amount,
      SUM(le.settlement_amount) AS settlement_amount
    FROM ledger_entries le
    GROUP BY le.subject_id, le.counterparty_id
  )
  SELECT
    a.subject_id,
    subject_profile.name,
    a.counterparty_id,
    counterparty_profile.name,
    a.advance_amount + a.settlement_amount AS amount,
    (
      (a.advance_amount = 0 AND a.settlement_amount <> 0) OR
      (a.advance_amount * (a.advance_amount + a.settlement_amount) < 0)
    ) AS is_over_settled
  FROM aggregated a
  JOIN public.household_members subject_member
    ON subject_member.household_id = target_household
   AND subject_member.user_id = a.subject_id
  LEFT JOIN public.profiles subject_profile ON subject_profile.id = a.subject_id
  LEFT JOIN public.profiles counterparty_profile ON counterparty_profile.id = a.counterparty_id
  WHERE a.advance_amount + a.settlement_amount <> 0
  ORDER BY subject_member.joined_at, a.counterparty_id NULLS FIRST;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_balance_settlement(
  target_household UUID,
  target_subject_user UUID,
  target_counterparty_user UUID,
  target_amount NUMERIC,
  target_settled_on DATE,
  target_note TEXT DEFAULT NULL
)
RETURNS SETOF public.settlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  resolved_from_user UUID;
  resolved_to_user UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF target_amount IS NULL OR target_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = target_household
      AND hm.user_id = target_subject_user
  ) THEN
    RAISE EXCEPTION 'Settlement subject is not a household member';
  END IF;

  IF target_counterparty_user IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = target_household
      AND hm.user_id = target_counterparty_user
  ) THEN
    RAISE EXCEPTION 'Settlement counterparty is not a household member';
  END IF;

  IF target_subject_user = target_counterparty_user THEN
    RAISE EXCEPTION 'Cannot settle with the same member';
  END IF;

  -- 同じ残高に対する同時精算を直列化する。
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      target_household::TEXT || ':' ||
      LEAST(target_subject_user::TEXT, COALESCE(target_counterparty_user::TEXT, 'household')) || ':' ||
      GREATEST(target_subject_user::TEXT, COALESCE(target_counterparty_user::TEXT, 'household')),
      0
    )
  );

  SELECT breakdown.balance_amount
  INTO current_balance
  FROM public.get_household_balance_breakdown(target_household) breakdown
  WHERE breakdown.subject_user_id = target_subject_user
    AND breakdown.counterparty_user_id IS NOT DISTINCT FROM target_counterparty_user;

  IF current_balance IS NULL OR current_balance = 0 THEN
    RAISE EXCEPTION 'There is no outstanding balance to settle';
  END IF;

  IF target_amount > ABS(current_balance) THEN
    RAISE EXCEPTION 'Settlement amount exceeds the outstanding balance';
  END IF;

  IF current_balance > 0 THEN
    resolved_from_user := target_counterparty_user;
    resolved_to_user := target_subject_user;
  ELSE
    resolved_from_user := target_subject_user;
    resolved_to_user := target_counterparty_user;
  END IF;

  RETURN QUERY
  INSERT INTO public.settlements (
    household_id,
    from_user_id,
    to_user_id,
    amount,
    settled_on,
    note,
    created_by
  ) VALUES (
    target_household,
    resolved_from_user,
    resolved_to_user,
    target_amount,
    target_settled_on,
    NULLIF(BTRIM(target_note), ''),
    auth.uid()
  )
  RETURNING *;
END;
$$;

-- 新規・更新データに世帯外ユーザーが混ざることを防ぐ。
CREATE OR REPLACE FUNCTION public.validate_household_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  participant UUID;
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    FOREACH participant IN ARRAY ARRAY[NEW.payer_user_id, NEW.advance_to_user_id]
    LOOP
      IF participant IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = NEW.household_id AND hm.user_id = participant
      ) THEN
        RAISE EXCEPTION 'Transaction participant is not a household member';
      END IF;
    END LOOP;
  ELSE
    FOREACH participant IN ARRAY ARRAY[NEW.from_user_id, NEW.to_user_id]
    LOOP
      IF participant IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = NEW.household_id AND hm.user_id = participant
      ) THEN
        RAISE EXCEPTION 'Settlement participant is not a household member';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- RPCを経由しないINSERTでも、現在残高・方向・上限を検証する。
CREATE OR REPLACE FUNCTION public.validate_settlement_against_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  subject_user UUID;
  counterparty_user UUID;
  current_balance NUMERIC;
BEGIN
  IF NEW.from_user_id IS NULL THEN
    subject_user := NEW.to_user_id;
    counterparty_user := NULL;
  ELSIF NEW.to_user_id IS NULL THEN
    subject_user := NEW.from_user_id;
    counterparty_user := NULL;
  ELSE
    subject_user := NEW.to_user_id;
    counterparty_user := NEW.from_user_id;
  END IF;

  IF subject_user IS NULL THEN
    RAISE EXCEPTION 'Settlement subject is required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      NEW.household_id::TEXT || ':' ||
      LEAST(subject_user::TEXT, COALESCE(counterparty_user::TEXT, 'household')) || ':' ||
      GREATEST(subject_user::TEXT, COALESCE(counterparty_user::TEXT, 'household')),
      0
    )
  );

  SELECT breakdown.balance_amount
  INTO current_balance
  FROM public.get_household_balance_breakdown(NEW.household_id) breakdown
  WHERE breakdown.subject_user_id = subject_user
    AND breakdown.counterparty_user_id IS NOT DISTINCT FROM counterparty_user;

  IF current_balance IS NULL OR current_balance = 0 THEN
    RAISE EXCEPTION 'There is no outstanding balance to settle';
  END IF;

  IF NEW.amount > ABS(current_balance) THEN
    RAISE EXCEPTION 'Settlement amount exceeds the outstanding balance';
  END IF;

  IF NEW.from_user_id IS NULL AND current_balance < 0 THEN
    RAISE EXCEPTION 'Settlement direction does not match the outstanding balance';
  ELSIF NEW.to_user_id IS NULL AND current_balance > 0 THEN
    RAISE EXCEPTION 'Settlement direction does not match the outstanding balance';
  ELSIF NEW.from_user_id IS NOT NULL AND NEW.to_user_id IS NOT NULL AND current_balance < 0 THEN
    RAISE EXCEPTION 'Settlement direction does not match the outstanding balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_transaction_participants ON public.transactions;
CREATE TRIGGER validate_transaction_participants
  BEFORE INSERT OR UPDATE OF household_id, payer_user_id, advance_to_user_id
  ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_household_participants();

DROP TRIGGER IF EXISTS validate_settlement_participants ON public.settlements;
CREATE TRIGGER validate_settlement_participants
  BEFORE INSERT OR UPDATE OF household_id, from_user_id, to_user_id
  ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_household_participants();

DROP TRIGGER IF EXISTS validate_settlement_balance ON public.settlements;
CREATE TRIGGER validate_settlement_balance
  BEFORE INSERT ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_settlement_against_balance();

GRANT EXECUTE ON FUNCTION public.get_household_balance_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_balance_settlement(UUID, UUID, UUID, NUMERIC, DATE, TEXT) TO authenticated;

COMMIT;
