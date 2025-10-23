-- 004_fix_join_code_update_policy.sql
-- 参加コードのステータス更新のためのRLSポリシー修正

BEGIN;

-- 既存の参加コード更新ポリシーを削除
DROP POLICY IF EXISTS "Users can consume join codes" ON public.household_join_codes;

-- 修正されたポリシーを作成
-- 1. 世帯のオーナーが参加コードを管理できる
-- 2. 参加コードを使用するユーザーがステータスを更新できる
CREATE POLICY "Users can consume join codes" ON public.household_join_codes
  FOR UPDATE
  TO authenticated
  USING (
    -- 世帯のオーナーが参加コードを管理する場合
    public.is_household_owner(household_join_codes.household_id)
    -- または、参加コードを使用するユーザーがステータスを更新する場合
    OR (
      household_join_codes.status = 'active'
      AND household_join_codes.expires_at > NOW()
    )
  )
  WITH CHECK (
    -- 世帯のオーナーが参加コードを管理する場合
    public.is_household_owner(household_join_codes.household_id)
    -- または、参加コードを使用するユーザーがステータスを更新する場合
    OR (
      auth.uid() = household_join_codes.used_by
      AND household_join_codes.status = 'used'
    )
  );

COMMIT;
