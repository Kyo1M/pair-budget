-- 現在適用されているhouseholdsテーブルのRLSポリシーを確認するクエリ
-- Supabase StudioのSQLエディタで実行してください

-- 1. householdsテーブルのすべてのポリシーを表示
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'households'
ORDER BY policyname;

-- 2. householdsテーブルのRLSが有効か確認
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'households';

-- 3. household_membersテーブルのポリシーも確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'household_members'
ORDER BY policyname;
