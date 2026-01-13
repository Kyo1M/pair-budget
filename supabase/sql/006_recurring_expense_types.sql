-- 006_recurring_expense_types.sql
-- 定期支出に固定費/変動費の種類を追加

BEGIN;

----------------------------
-- 1. expense_type カラム追加
----------------------------

-- 固定費/変動費の区別用カラムを追加
-- デフォルト値 'fixed' により既存データは自動的に固定費として移行
ALTER TABLE public.recurring_expenses
ADD COLUMN IF NOT EXISTS expense_type TEXT NOT NULL DEFAULT 'fixed'
CHECK (expense_type IN ('fixed', 'variable'));

-- インデックス追加（expense_type での絞り込み用）
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_expense_type
ON public.recurring_expenses(expense_type);

----------------------------
-- 2. 固定費を日付ベースで生成する関数
----------------------------

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
  current_month TEXT;
  transaction_date DATE;
  transaction_exists BOOLEAN;
  last_day_of_month INTEGER;
BEGIN
  -- 認証チェック
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 現在の月を取得 (YYYY-MM形式)
  current_month := TO_CHAR(target_date, 'YYYY-MM');

  -- 対象月の最終日を取得
  last_day_of_month := EXTRACT(DAY FROM (
    DATE_TRUNC('month', target_date) + INTERVAL '1 month' - INTERVAL '1 day'
  ));

  -- 有効な固定費のみを取得
  FOR recurring_record IN
    SELECT *
    FROM public.recurring_expenses
    WHERE household_id = target_household
      AND is_active = true
      AND expense_type = 'fixed'
  LOOP
    -- 支払日を計算（31日指定の場合は月末日を上限）
    transaction_date := (
      DATE_TRUNC('month', target_date) +
      (LEAST(recurring_record.day_of_month, last_day_of_month) - 1) * INTERVAL '1 day'
    )::DATE;

    -- 指定日を過ぎていない場合はスキップ
    IF transaction_date > target_date THEN
      CONTINUE;
    END IF;

    -- 既に対応するトランザクションが存在するかチェック
    SELECT EXISTS(
      SELECT 1
      FROM public.transactions
      WHERE household_id = target_household
        AND type = 'expense'
        AND category = recurring_record.category
        AND amount = recurring_record.amount
        AND occurred_on = transaction_date
        AND payer_user_id = recurring_record.payer_user_id
        AND note IS NOT DISTINCT FROM recurring_record.note
    ) INTO transaction_exists;

    -- トランザクションが存在しない場合は作成
    IF NOT transaction_exists THEN
      INSERT INTO public.transactions (
        household_id,
        type,
        amount,
        occurred_on,
        category,
        note,
        payer_user_id,
        created_by
      )
      VALUES (
        target_household,
        'expense',
        recurring_record.amount,
        transaction_date,
        recurring_record.category,
        recurring_record.note,
        recurring_record.payer_user_id,
        auth.uid()
      );

      generated_count := generated_count + 1;
    END IF;
  END LOOP;

  RETURN generated_count;
END;
$$;

----------------------------
-- 3. 変動費リマインダー取得関数
----------------------------

CREATE OR REPLACE FUNCTION public.get_variable_expense_reminders(
  target_household UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  day_of_month INTEGER,
  category TEXT,
  note TEXT,
  payer_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day INTEGER;
  current_year INTEGER;
  current_month_num INTEGER;
BEGIN
  -- 認証チェック
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  current_day := EXTRACT(DAY FROM target_date);
  current_year := EXTRACT(YEAR FROM target_date);
  current_month_num := EXTRACT(MONTH FROM target_date);

  RETURN QUERY
  SELECT
    re.id,
    re.amount,
    re.day_of_month,
    re.category,
    re.note,
    re.payer_user_id
  FROM public.recurring_expenses re
  WHERE re.household_id = target_household
    AND re.is_active = true
    AND re.expense_type = 'variable'
    AND re.day_of_month <= current_day
    -- 今月分のトランザクションがまだ登録されていない変動費のみ
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.household_id = target_household
        AND t.type = 'expense'
        AND t.category = re.category
        AND t.note IS NOT DISTINCT FROM re.note
        AND EXTRACT(YEAR FROM t.occurred_on) = current_year
        AND EXTRACT(MONTH FROM t.occurred_on) = current_month_num
    );
END;
$$;

----------------------------
-- 4. 関数の実行権限を付与
----------------------------

GRANT EXECUTE ON FUNCTION public.generate_fixed_transactions_by_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_variable_expense_reminders(UUID, DATE) TO authenticated;

COMMIT;
