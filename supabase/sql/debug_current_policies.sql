-- 現在のhouseholdsテーブルのRLSポリシーを確認
-- Supabase StudioのSQLエディタで実行してください

-- 1. householdsのINSERTポリシーを確認
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'households'
ORDER BY cmd, policyname;

-- 期待される結果:
-- INSERTポリシーの with_check_expression が "true" であるべき
