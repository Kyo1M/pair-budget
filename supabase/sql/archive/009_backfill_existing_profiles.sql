-- 009_backfill_existing_profiles.sql
-- 既存のauth.usersレコードに対応するprofilesレコードを作成
-- 世帯作成エラーを防ぐため、すべてのユーザーにprofilesレコードが必要

BEGIN;

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
