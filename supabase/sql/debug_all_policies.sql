-- 全てのRLSポリシーを確認
-- 問題箇所を特定するためのデバッグクエリ

-- 1. householdsテーブルの全ポリシー
SELECT
  '=== households ===' AS table_info,
  policyname,
  cmd,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'households'
ORDER BY cmd, policyname;

-- 2. household_membersテーブルの全ポリシー
SELECT
  '=== household_members ===' AS table_info,
  policyname,
  cmd,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'household_members'
ORDER BY cmd, policyname;

-- 3. profilesテーブルの全ポリシー
SELECT
  '=== profiles ===' AS table_info,
  policyname,
  cmd,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. RLSが有効になっているか確認
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('households', 'household_members', 'profiles')
ORDER BY tablename;

-- 5. ヘルパー関数が存在するか確認
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname IN ('is_household_member', 'is_household_owner', 'handle_new_user')
ORDER BY proname;
