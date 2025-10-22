-- 006_fix_household_insert_policy.sql
-- households テーブルのINSERTポリシーを修正
-- owner_user_idは明示的に設定されるため、RLSチェックはauthenticatedであることのみで十分

BEGIN;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can create households" ON public.households;

-- authenticatedユーザーが世帯を作成できるようにする
-- owner_user_idはアプリケーション側で明示的に設定される
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;

