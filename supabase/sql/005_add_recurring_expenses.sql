-- 005_add_recurring_expenses.sql
-- 定期支出機能のためのテーブルとポリシーを追加

BEGIN;

----------------------------
-- 1. recurring_expenses テーブル作成
----------------------------

CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  category TEXT NOT NULL CHECK (category IN ('groceries', 'dining', 'daily', 'medical', 'home', 'kids', 'transportation', 'fixed', 'other')),
  note TEXT,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

----------------------------
-- 2. インデックス作成
----------------------------

CREATE INDEX idx_recurring_expenses_household_id ON public.recurring_expenses(household_id);
CREATE INDEX idx_recurring_expenses_payer_user_id ON public.recurring_expenses(payer_user_id);
CREATE INDEX idx_recurring_expenses_is_active ON public.recurring_expenses(is_active);

----------------------------
-- 3. RLS有効化
----------------------------

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

----------------------------
-- 4. RLSポリシー作成
----------------------------

-- 世帯メンバーは定期支出を閲覧可能
DROP POLICY IF EXISTS "Household members can view recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Household members can view recurring expenses" ON public.recurring_expenses
  FOR SELECT
  USING (public.is_household_member(recurring_expenses.household_id));

-- 世帯メンバーは定期支出を作成可能
DROP POLICY IF EXISTS "Household members can insert recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Household members can insert recurring expenses" ON public.recurring_expenses
  FOR INSERT
  WITH CHECK (
    public.is_household_member(recurring_expenses.household_id)
    AND auth.uid() = recurring_expenses.created_by
  );

-- 作成者は定期支出を更新可能
DROP POLICY IF EXISTS "Creators can update recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Creators can update recurring expenses" ON public.recurring_expenses
  FOR UPDATE
  USING (auth.uid() = recurring_expenses.created_by)
  WITH CHECK (auth.uid() = recurring_expenses.created_by);

-- 作成者は定期支出を削除可能
DROP POLICY IF EXISTS "Creators can delete recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Creators can delete recurring expenses" ON public.recurring_expenses
  FOR DELETE
  USING (auth.uid() = recurring_expenses.created_by);

----------------------------
-- 5. 権限付与
----------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses TO authenticated;

----------------------------
-- 6. 定期支出からトランザクションを生成する関数
----------------------------

CREATE OR REPLACE FUNCTION public.generate_recurring_transactions(
  target_household UUID,
  target_month TEXT -- YYYY-MM形式
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_count INTEGER := 0;
  recurring_record RECORD;
  target_date DATE;
  transaction_exists BOOLEAN;
  last_day_of_month INTEGER;
BEGIN
  -- 認証チェック
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 対象月の最終日を取得
  last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', TO_DATE(target_month, 'YYYY-MM')) + INTERVAL '1 month' - INTERVAL '1 day'));

  -- 有効な定期支出を取得
  FOR recurring_record IN
    SELECT *
    FROM public.recurring_expenses
    WHERE household_id = target_household
      AND is_active = true
  LOOP
    -- 支払日を計算（31日指定の場合は月末日を上限とする）
    target_date := TO_DATE(target_month || '-' || LEAST(recurring_record.day_of_month, last_day_of_month), 'YYYY-MM-DD');

    -- 既に対応するトランザクションが存在するかチェック
    SELECT EXISTS(
      SELECT 1
      FROM public.transactions
      WHERE household_id = target_household
        AND type = 'expense'
        AND category = recurring_record.category
        AND amount = recurring_record.amount
        AND occurred_on = target_date
        AND payer_user_id = recurring_record.payer_user_id
        AND note = recurring_record.note
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
      )       VALUES (
        target_household,
        'expense',
        recurring_record.amount,
        target_date,
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

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION public.generate_recurring_transactions(UUID, TEXT) TO authenticated;

COMMIT;
