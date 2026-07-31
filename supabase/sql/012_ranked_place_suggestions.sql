-- 012_ranked_place_suggestions.sql
-- 場所候補を最終利用日・利用回数付きで返す。

BEGIN;

CREATE OR REPLACE FUNCTION public.get_ranked_place_suggestions(
  target_household UUID
)
RETURNS TABLE (
  place TEXT,
  use_count BIGINT,
  last_used_on DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    BTRIM(t.place) AS place,
    COUNT(*) AS use_count,
    MAX(t.occurred_on) AS last_used_on
  FROM public.transactions t
  WHERE t.household_id = target_household
    AND t.place IS NOT NULL
    AND BTRIM(t.place) <> ''
  GROUP BY BTRIM(t.place)
  ORDER BY MAX(t.occurred_on) DESC, COUNT(*) DESC, BTRIM(t.place)
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranked_place_suggestions(UUID) TO authenticated;

COMMIT;
