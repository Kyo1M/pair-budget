-- 003_fix_join_code_policy.sql
-- 参加コードを使用した世帯参加のためのRLSポリシー修正

BEGIN;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;

-- 修正されたポリシーを作成
-- 1. 世帯のオーナーがメンバーを追加できる
-- 2. 世帯作成時にオーナー自身を追加できる
-- 3. 参加コードを使用して自分自身をメンバーとして追加できる
CREATE POLICY "Household members can add members" ON public.household_members
  FOR INSERT
  WITH CHECK (
    -- 世帯のオーナーがメンバーを追加する場合
    public.is_household_owner(household_members.household_id)
    -- または、世帯作成時にオーナー自身を追加する場合
    OR (
      auth.uid() = household_members.user_id
      AND EXISTS (
        SELECT 1
        FROM public.households h
        WHERE h.id = household_members.household_id
          AND h.owner_user_id = auth.uid()
      )
    )
    -- または、既存の世帯メンバーが新しいメンバーを招待する場合
    OR public.is_household_member(household_members.household_id)
    -- または、参加コードを使用して自分自身をメンバーとして追加する場合
    OR (
      auth.uid() = household_members.user_id
      AND EXISTS (
        SELECT 1
        FROM public.household_join_codes hjc
        WHERE hjc.household_id = household_members.household_id
          AND hjc.status = 'active'
          AND hjc.expires_at > NOW()
      )
    )
  );

COMMIT;
