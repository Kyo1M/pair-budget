-- 007_add_recurring_incomes.sql
-- 定期収入機能のためのテーブルとポリシーを追加

BEGIN;

----------------------------
-- 1. recurring_incomes テーブル作成
----------------------------

CREATE TABLE public.recurring_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  category TEXT NOT NULL CHECK (category IN ('salary', 'sideline', 'windfall', 'subsidy')),
  note TEXT,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

----------------------------
-- 2. インデックス作成
----------------------------

CREATE INDEX idx_recurring_incomes_household_id ON public.recurring_incomes(household_id);
CREATE INDEX idx_recurring_incomes_recipient_user_id ON public.recurring_incomes(recipient_user_id);
CREATE INDEX idx_recurring_incomes_is_active ON public.recurring_incomes(is_active);

----------------------------
-- 3. RLS有効化
----------------------------

ALTER TABLE public.recurring_incomes ENABLE ROW LEVEL SECURITY;

----------------------------
-- 4. RLSポリシー作成
----------------------------

-- 世帯メンバーは定期収入を閲覧可能
DROP POLICY IF EXISTS "Household members can view recurring incomes" ON public.recurring_incomes;
CREATE POLICY "Household members can view recurring incomes" ON public.recurring_incomes
  FOR SELECT
  USING (public.is_household_member(recurring_incomes.household_id));

-- 世帯メンバーは定期収入を作成可能
DROP POLICY IF EXISTS "Household members can insert recurring incomes" ON public.recurring_incomes;
CREATE POLICY "Household members can insert recurring incomes" ON public.recurring_incomes
  FOR INSERT
  WITH CHECK (
    public.is_household_member(recurring_incomes.household_id)
    AND auth.uid() = recurring_incomes.created_by
  );

-- 作成者は定期収入を更新可能
DROP POLICY IF EXISTS "Creators can update recurring incomes" ON public.recurring_incomes;
CREATE POLICY "Creators can update recurring incomes" ON public.recurring_incomes
  FOR UPDATE
  USING (auth.uid() = recurring_incomes.created_by)
  WITH CHECK (auth.uid() = recurring_incomes.created_by);

-- 作成者は定期収入を削除可能
DROP POLICY IF EXISTS "Creators can delete recurring incomes" ON public.recurring_incomes;
CREATE POLICY "Creators can delete recurring incomes" ON public.recurring_incomes
  FOR DELETE
  USING (auth.uid() = recurring_incomes.created_by);

----------------------------
-- 5. 権限付与
----------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_incomes TO authenticated;

----------------------------
-- 6. 収入リマインダー取得関数
----------------------------

CREATE OR REPLACE FUNCTION public.get_income_reminders(
  target_household UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  day_of_month INTEGER,
  category TEXT,
  note TEXT,
  recipient_user_id UUID
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
    ri.id,
    ri.amount,
    ri.day_of_month,
    ri.category,
    ri.note,
    ri.recipient_user_id
  FROM public.recurring_incomes ri
  WHERE ri.household_id = target_household
    AND ri.is_active = true
    AND ri.day_of_month <= current_day
    -- 今月分の収入がまだ登録されていないもののみ
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.household_id = target_household
        AND t.type = 'income'
        AND t.category = ri.category
        AND t.note IS NOT DISTINCT FROM ri.note
        AND EXTRACT(YEAR FROM t.occurred_on) = current_year
        AND EXTRACT(MONTH FROM t.occurred_on) = current_month_num
    );
END;
$$;

----------------------------
-- 7. 関数の実行権限を付与
----------------------------

GRANT EXECUTE ON FUNCTION public.get_income_reminders(UUID, DATE) TO authenticated;

COMMIT;
