-- 010_fix_household_creation_comprehensive.sql
-- 世帯作成エラーを完全に修正する統合マイグレーション
-- このファイル1つをSupabase StudioのSQLエディタで実行してください

BEGIN;

-- ============================================
-- 1. householdsテーブルのINSERTポリシーを修正
-- ============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can create households" ON public.households;

-- authenticatedユーザーが世帯を作成できるようにする
-- owner_user_idはアプリケーション側で明示的に設定される
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 2. 不要なトリガーを削除（もし存在すれば）
-- ============================================

-- AFTER INSERTトリガーを削除（household_membersへの自動追加）
DROP TRIGGER IF EXISTS add_household_owner_trigger ON public.households;

-- BEFORE INSERTトリガーを削除（owner_user_idの自動設定）
DROP TRIGGER IF EXISTS set_household_owner_before_insert ON public.households;

-- トリガー関数も削除（もし存在すれば）
DROP FUNCTION IF EXISTS public.add_household_owner_as_member();
DROP FUNCTION IF EXISTS public.set_household_owner_id();

-- ============================================
-- 3. profilesレコード自動作成トリガーを追加
-- ============================================

-- トリガー関数を作成（既存の場合は置き換え）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.usersに新規ユーザーが作成されたら、profilesテーブルにもレコードを作成
  INSERT INTO public.profiles (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- auth.usersテーブルにトリガーを設定
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. 既存ユーザーのprofilesレコードをバックフィル
-- ============================================

-- auth.usersに存在するがprofilesに存在しないユーザーのレコードを作成
INSERT INTO public.profiles (id, email, name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email) AS name,
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================
-- 実行後の確認クエリ（オプション）
-- ============================================

-- 適用されたポリシーを確認
-- SELECT policyname, with_check
-- FROM pg_policies
-- WHERE tablename = 'households' AND cmd = 'INSERT';

-- profilesレコードが揃っているか確認
-- SELECT
--   COUNT(*) as auth_users_count,
--   (SELECT COUNT(*) FROM public.profiles) as profiles_count
-- FROM auth.users;
