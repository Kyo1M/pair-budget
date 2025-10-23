-- 004_fix_household_creation_policies.sql
-- 世帯作成時のRLSポリシー問題を根本的に修正します。
-- 世帯作成とオーナーのメンバー追加を確実に実行できるようにします。

BEGIN;

----------------------------
-- 1. 世帯作成時のRLSポリシー修正
----------------------------

-- households テーブルのINSERTポリシーを修正
DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = owner_user_id
  );

-- household_members テーブルのINSERTポリシーを修正
-- 世帯作成時にオーナーをメンバーとして追加できるようにする
DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;
CREATE POLICY "Household owners can add members" ON public.household_members
  FOR INSERT
  WITH CHECK (
    -- 世帯のオーナーである場合
    public.is_household_owner(household_members.household_id)
    -- または、自分自身をメンバーとして追加する場合（世帯作成時）
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
  );

----------------------------
-- 2. 世帯作成用のヘルパー関数を追加
----------------------------

-- 世帯作成とオーナーのメンバー追加を一括で行う関数
CREATE OR REPLACE FUNCTION public.create_household_with_owner(
  household_name TEXT,
  owner_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 世帯を作成
  INSERT INTO public.households (name, owner_user_id)
  VALUES (household_name, owner_user_id)
  RETURNING id INTO new_household_id;

  -- オーナーをメンバーとして追加
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, owner_user_id, 'owner')
  ON CONFLICT (household_id, user_id) DO NOTHING;

  RETURN new_household_id;
END;
$$;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION public.create_household_with_owner(TEXT, UUID) TO authenticated;

----------------------------
-- 3. 既存のトリガーを無効化（新しい関数を使用するため）
----------------------------

-- 世帯作成時のオーナー追加トリガーを無効化
DROP TRIGGER IF EXISTS add_household_owner_trigger ON public.households;

----------------------------
-- 4. 追加のセキュリティポリシー
----------------------------

-- 世帯メンバーは世帯情報を更新できないようにする
DROP POLICY IF EXISTS "Household owners can update household" ON public.households;
CREATE POLICY "Household owners can update household" ON public.households
  FOR UPDATE
  USING (public.is_household_owner(households.id))
  WITH CHECK (public.is_household_owner(households.id));

-- 世帯の削除はオーナーのみ
DROP POLICY IF EXISTS "Household owners can delete household" ON public.households;
CREATE POLICY "Household owners can delete household" ON public.households
  FOR DELETE
  USING (public.is_household_owner(households.id));

COMMIT;
