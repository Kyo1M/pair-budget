-- 008_fix_rls_and_income_reminders.sql
-- 目的:
--  1) 2人世帯で「相手が登録した取引/精算/定期支出/定期収入」を削除・更新できるよう、
--     UPDATE/DELETE の RLS を作成者限定(created_by)から世帯メンバー基準(is_household_member)へ広げる。
--     → 収入削除バグ(削除が0行で無言失敗し、再フェッチで値が復活する)の根本原因を解消。
--  2) 収入リマインダーの重複判定を category+note から category+recipient(payer_user_id) へ変更し、
--     2人の同一カテゴリ収入(例: それぞれの給料)を正しく区別する。
--     ※ income 取引は payer_user_id に「受取者」を記録する慣習に依拠。

BEGIN;

----------------------------
-- 1. transactions: UPDATE/DELETE を世帯メンバー基準へ
----------------------------

DROP POLICY IF EXISTS "Creators can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can update transactions" ON public.transactions;
CREATE POLICY "Household members can update transactions" ON public.transactions
  FOR UPDATE
  USING (public.is_household_member(transactions.household_id))
  WITH CHECK (public.is_household_member(transactions.household_id));

DROP POLICY IF EXISTS "Creators can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can delete transactions" ON public.transactions;
CREATE POLICY "Household members can delete transactions" ON public.transactions
  FOR DELETE
  USING (public.is_household_member(transactions.household_id));

----------------------------
-- 2. settlements: DELETE を世帯メンバー基準へ
----------------------------

DROP POLICY IF EXISTS "Creators can delete settlements" ON public.settlements;
DROP POLICY IF EXISTS "Household members can delete settlements" ON public.settlements;
CREATE POLICY "Household members can delete settlements" ON public.settlements
  FOR DELETE
  USING (public.is_household_member(settlements.household_id));

----------------------------
-- 3. recurring_expenses: UPDATE/DELETE を世帯メンバー基準へ
----------------------------

DROP POLICY IF EXISTS "Creators can update recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Household members can update recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Household members can update recurring expenses" ON public.recurring_expenses
  FOR UPDATE
  USING (public.is_household_member(recurring_expenses.household_id))
  WITH CHECK (public.is_household_member(recurring_expenses.household_id));

DROP POLICY IF EXISTS "Creators can delete recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Household members can delete recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Household members can delete recurring expenses" ON public.recurring_expenses
  FOR DELETE
  USING (public.is_household_member(recurring_expenses.household_id));

----------------------------
-- 4. recurring_incomes: UPDATE/DELETE を世帯メンバー基準へ
----------------------------

DROP POLICY IF EXISTS "Creators can update recurring incomes" ON public.recurring_incomes;
DROP POLICY IF EXISTS "Household members can update recurring incomes" ON public.recurring_incomes;
CREATE POLICY "Household members can update recurring incomes" ON public.recurring_incomes
  FOR UPDATE
  USING (public.is_household_member(recurring_incomes.household_id))
  WITH CHECK (public.is_household_member(recurring_incomes.household_id));

DROP POLICY IF EXISTS "Creators can delete recurring incomes" ON public.recurring_incomes;
DROP POLICY IF EXISTS "Household members can delete recurring incomes" ON public.recurring_incomes;
CREATE POLICY "Household members can delete recurring incomes" ON public.recurring_incomes
  FOR DELETE
  USING (public.is_household_member(recurring_incomes.household_id));

----------------------------
-- 5. 収入リマインダー: 重複判定を category + recipient(payer_user_id) へ
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
  month_start DATE;
  next_month_start DATE;
BEGIN
  -- 認証チェック
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  current_day := EXTRACT(DAY FROM target_date);
  month_start := DATE_TRUNC('month', target_date)::date;
  next_month_start := (DATE_TRUNC('month', target_date) + INTERVAL '1 month')::date;

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
    -- 今月、同一カテゴリ かつ 同一受取者 の収入がまだ登録されていないもののみリマインドする。
    -- income 取引は payer_user_id に受取者を記録する慣習に依拠（リマインダー経由の登録で付与）。
    -- occurred_on は EXTRACT ではなく範囲比較にし、インデックスが効く(sargable)ようにする。
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.household_id = target_household
        AND t.type = 'income'
        AND t.category = ri.category
        AND t.payer_user_id IS NOT DISTINCT FROM ri.recipient_user_id
        AND t.occurred_on >= month_start
        AND t.occurred_on < next_month_start
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_income_reminders(UUID, DATE) TO authenticated;

COMMIT;
