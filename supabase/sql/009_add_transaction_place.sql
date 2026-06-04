-- 009_add_transaction_place.sql
-- transactions に任意の place（場所）カラムと、過去 place のサジェスト取得関数を追加

BEGIN;

----------------------------
-- 1. place カラム追加
----------------------------

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS place TEXT;

-- 50文字上限（zod と DB を一致させる。冪等化のため存在チェック）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_place_len_chk'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_place_len_chk
      CHECK (place IS NULL OR char_length(place) <= 50);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_household_place
  ON public.transactions(household_id, place);

----------------------------
-- 2. place サジェスト取得関数
----------------------------

CREATE OR REPLACE FUNCTION public.get_place_suggestions(target_household UUID)
RETURNS TABLE (place TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.place
  FROM public.transactions t
  WHERE t.household_id = target_household
    AND public.is_household_member(target_household)
    AND t.place IS NOT NULL
    AND t.place <> ''
  ORDER BY t.place ASC;
$$;

----------------------------
-- 3. 実行権限
----------------------------

GRANT EXECUTE ON FUNCTION public.get_place_suggestions(UUID) TO authenticated;

COMMIT;
