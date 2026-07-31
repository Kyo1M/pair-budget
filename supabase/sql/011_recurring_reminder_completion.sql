-- 011_recurring_reminder_completion.sql
-- 定期設定と取引を直接関連付け、月次のリマインダー非表示を永続化する。

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurring_expense_id UUID
    REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_income_id UUID
    REFERENCES public.recurring_incomes(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_single_recurring_source_check,
  ADD CONSTRAINT transactions_single_recurring_source_check
    CHECK (NUM_NONNULLS(recurring_expense_id, recurring_income_id) <= 1),
  DROP CONSTRAINT IF EXISTS transactions_recurring_expense_type_check,
  ADD CONSTRAINT transactions_recurring_expense_type_check
    CHECK (recurring_expense_id IS NULL OR type = 'expense'),
  DROP CONSTRAINT IF EXISTS transactions_recurring_income_type_check,
  ADD CONSTRAINT transactions_recurring_income_type_check
    CHECK (recurring_income_id IS NULL OR type = 'income');

-- 定期設定の参照先が取引と同じ世帯であることを保証する。
CREATE OR REPLACE FUNCTION public.validate_recurring_transaction_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.recurring_expense_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.recurring_expenses re
    WHERE re.id = NEW.recurring_expense_id AND re.household_id = NEW.household_id
  ) THEN
    RAISE EXCEPTION 'Recurring expense does not belong to the transaction household';
  END IF;

  IF NEW.recurring_income_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.recurring_incomes ri
    WHERE ri.id = NEW.recurring_income_id AND ri.household_id = NEW.household_id
  ) THEN
    RAISE EXCEPTION 'Recurring income does not belong to the transaction household';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_transaction_recurring_source ON public.transactions;
CREATE TRIGGER validate_transaction_recurring_source
  BEFORE INSERT OR UPDATE OF household_id, type, recurring_expense_id, recurring_income_id
  ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_transaction_source();

CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_expense_month_uidx
  ON public.transactions (recurring_expense_id, DATE_TRUNC('month', occurred_on::timestamp))
  WHERE recurring_expense_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_income_month_uidx
  ON public.transactions (recurring_income_id, DATE_TRUNC('month', occurred_on::timestamp))
  WHERE recurring_income_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.recurring_reminder_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  recurring_income_id UUID REFERENCES public.recurring_incomes(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  dismissed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (NUM_NONNULLS(recurring_expense_id, recurring_income_id) = 1),
  CHECK (period_month = DATE_TRUNC('month', period_month)::date)
);

CREATE UNIQUE INDEX IF NOT EXISTS recurring_expense_dismissal_month_uidx
  ON public.recurring_reminder_dismissals (recurring_expense_id, period_month)
  WHERE recurring_expense_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recurring_income_dismissal_month_uidx
  ON public.recurring_reminder_dismissals (recurring_income_id, period_month)
  WHERE recurring_income_id IS NOT NULL;

ALTER TABLE public.recurring_reminder_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can view reminder dismissals" ON public.recurring_reminder_dismissals;
CREATE POLICY "Household members can view reminder dismissals"
  ON public.recurring_reminder_dismissals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recurring_expenses re
      WHERE re.id = recurring_expense_id AND public.is_household_member(re.household_id)
    ) OR EXISTS (
      SELECT 1 FROM public.recurring_incomes ri
      WHERE ri.id = recurring_income_id AND public.is_household_member(ri.household_id)
    )
  );

DROP POLICY IF EXISTS "Household members can create reminder dismissals" ON public.recurring_reminder_dismissals;
CREATE POLICY "Household members can create reminder dismissals"
  ON public.recurring_reminder_dismissals FOR INSERT
  WITH CHECK (
    auth.uid() = dismissed_by AND (
      EXISTS (
        SELECT 1 FROM public.recurring_expenses re
        WHERE re.id = recurring_expense_id AND public.is_household_member(re.household_id)
      ) OR EXISTS (
        SELECT 1 FROM public.recurring_incomes ri
        WHERE ri.id = recurring_income_id AND public.is_household_member(ri.household_id)
      )
    )
  );

GRANT SELECT, INSERT, DELETE ON public.recurring_reminder_dismissals TO authenticated;

-- 一意に対応できる既存取引だけを保守的に関連付ける。
WITH candidates AS (
  SELECT
    t.id AS transaction_id,
    MIN(re.id::TEXT)::UUID AS recurring_id,
    t.occurred_on,
    t.created_at
  FROM public.transactions t
  JOIN public.recurring_expenses re
    ON re.household_id = t.household_id
   AND t.type = 'expense'
   AND re.amount = t.amount
   AND re.category = t.category
   AND re.payer_user_id = t.payer_user_id
   AND re.note IS NOT DISTINCT FROM t.note
   AND t.occurred_on = (
     DATE_TRUNC('month', t.occurred_on) +
     (
       LEAST(
         re.day_of_month,
         EXTRACT(DAY FROM (DATE_TRUNC('month', t.occurred_on) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
       ) - 1
     ) * INTERVAL '1 day'
   )::DATE
  WHERE t.recurring_expense_id IS NULL
  GROUP BY t.id, t.occurred_on, t.created_at
  HAVING COUNT(*) = 1
), ranked AS (
  SELECT
    candidates.*,
    ROW_NUMBER() OVER (
      PARTITION BY recurring_id, DATE_TRUNC('month', occurred_on::timestamp)
      ORDER BY occurred_on, created_at, transaction_id
    ) AS occurrence_rank
  FROM candidates
)
UPDATE public.transactions t
SET recurring_expense_id = ranked.recurring_id
FROM ranked
WHERE t.id = ranked.transaction_id AND ranked.occurrence_rank = 1;

WITH candidates AS (
  SELECT
    t.id AS transaction_id,
    MIN(ri.id::TEXT)::UUID AS recurring_id,
    t.occurred_on,
    t.created_at
  FROM public.transactions t
  JOIN public.recurring_incomes ri
    ON ri.household_id = t.household_id
   AND t.type = 'income'
   AND ri.amount = t.amount
   AND ri.category = t.category
   AND ri.recipient_user_id = t.payer_user_id
   AND ri.note IS NOT DISTINCT FROM t.note
   AND t.occurred_on = (
     DATE_TRUNC('month', t.occurred_on) +
     (
       LEAST(
         ri.day_of_month,
         EXTRACT(DAY FROM (DATE_TRUNC('month', t.occurred_on) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
       ) - 1
     ) * INTERVAL '1 day'
   )::DATE
  WHERE t.recurring_income_id IS NULL
  GROUP BY t.id, t.occurred_on, t.created_at
  HAVING COUNT(*) = 1
), ranked AS (
  SELECT
    candidates.*,
    ROW_NUMBER() OVER (
      PARTITION BY recurring_id, DATE_TRUNC('month', occurred_on::timestamp)
      ORDER BY occurred_on, created_at, transaction_id
    ) AS occurrence_rank
  FROM candidates
)
UPDATE public.transactions t
SET recurring_income_id = ranked.recurring_id
FROM ranked
WHERE t.id = ranked.transaction_id AND ranked.occurrence_rank = 1;

CREATE OR REPLACE FUNCTION public.generate_fixed_transactions_by_date(
  target_household UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_count INTEGER := 0;
  recurring_record RECORD;
  transaction_date DATE;
  last_day_of_month INTEGER;
BEGIN
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  last_day_of_month := EXTRACT(DAY FROM (
    DATE_TRUNC('month', target_date) + INTERVAL '1 month' - INTERVAL '1 day'
  ));

  FOR recurring_record IN
    SELECT * FROM public.recurring_expenses
    WHERE household_id = target_household AND is_active = true AND expense_type = 'fixed'
  LOOP
    transaction_date := (
      DATE_TRUNC('month', target_date) +
      (LEAST(recurring_record.day_of_month, last_day_of_month) - 1) * INTERVAL '1 day'
    )::DATE;

    IF transaction_date <= target_date AND NOT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.recurring_expense_id = recurring_record.id
        AND t.occurred_on >= DATE_TRUNC('month', target_date)::date
        AND t.occurred_on < (DATE_TRUNC('month', target_date) + INTERVAL '1 month')::date
    ) THEN
      INSERT INTO public.transactions (
        household_id, type, amount, occurred_on, category, note,
        payer_user_id, recurring_expense_id, created_by
      ) VALUES (
        target_household, 'expense', recurring_record.amount, transaction_date,
        recurring_record.category, recurring_record.note,
        recurring_record.payer_user_id, recurring_record.id, auth.uid()
      );
      generated_count := generated_count + 1;
    END IF;
  END LOOP;

  RETURN generated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_recurring_transactions(
  target_household UUID,
  target_month TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_count INTEGER := 0;
  recurring_record RECORD;
  transaction_date DATE;
  month_start DATE;
  next_month_start DATE;
  last_day_of_month INTEGER;
BEGIN
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  month_start := DATE_TRUNC('month', TO_DATE(target_month, 'YYYY-MM'))::date;
  next_month_start := (month_start + INTERVAL '1 month')::date;
  last_day_of_month := EXTRACT(DAY FROM (next_month_start - INTERVAL '1 day'));

  FOR recurring_record IN
    SELECT * FROM public.recurring_expenses
    WHERE household_id = target_household AND is_active = true AND expense_type = 'fixed'
  LOOP
    transaction_date := (
      month_start + (LEAST(recurring_record.day_of_month, last_day_of_month) - 1) * INTERVAL '1 day'
    )::date;

    IF NOT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.recurring_expense_id = recurring_record.id
        AND t.occurred_on >= month_start AND t.occurred_on < next_month_start
    ) THEN
      INSERT INTO public.transactions (
        household_id, type, amount, occurred_on, category, note,
        payer_user_id, recurring_expense_id, created_by
      ) VALUES (
        target_household, 'expense', recurring_record.amount, transaction_date,
        recurring_record.category, recurring_record.note,
        recurring_record.payer_user_id, recurring_record.id, auth.uid()
      );
      generated_count := generated_count + 1;
    END IF;
  END LOOP;

  RETURN generated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_variable_expense_reminders(
  target_household UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID, amount NUMERIC, day_of_month INTEGER, category TEXT,
  note TEXT, payer_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start DATE := DATE_TRUNC('month', target_date)::date;
  next_month_start DATE := (DATE_TRUNC('month', target_date) + INTERVAL '1 month')::date;
BEGIN
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT re.id, re.amount, re.day_of_month, re.category, re.note, re.payer_user_id
  FROM public.recurring_expenses re
  WHERE re.household_id = target_household
    AND re.is_active = true
    AND re.expense_type = 'variable'
    AND re.day_of_month <= EXTRACT(DAY FROM target_date)
    AND NOT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.recurring_expense_id = re.id
        AND t.occurred_on >= month_start AND t.occurred_on < next_month_start
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.recurring_reminder_dismissals d
      WHERE d.recurring_expense_id = re.id AND d.period_month = month_start
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_income_reminders(
  target_household UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID, amount NUMERIC, day_of_month INTEGER, category TEXT,
  note TEXT, recipient_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start DATE := DATE_TRUNC('month', target_date)::date;
  next_month_start DATE := (DATE_TRUNC('month', target_date) + INTERVAL '1 month')::date;
BEGIN
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT ri.id, ri.amount, ri.day_of_month, ri.category, ri.note, ri.recipient_user_id
  FROM public.recurring_incomes ri
  WHERE ri.household_id = target_household
    AND ri.is_active = true
    AND ri.day_of_month <= EXTRACT(DAY FROM target_date)
    AND NOT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.recurring_income_id = ri.id
        AND t.occurred_on >= month_start AND t.occurred_on < next_month_start
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.recurring_reminder_dismissals d
      WHERE d.recurring_income_id = ri.id AND d.period_month = month_start
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_fixed_transactions_by_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recurring_transactions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_variable_expense_reminders(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_income_reminders(UUID, DATE) TO authenticated;

COMMIT;
