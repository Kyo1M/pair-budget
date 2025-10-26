-- 003_grant_household_permissions.sql
-- households ドメイン用のテーブル権限を authenticated ロールに付与します。
-- 001_create_household_module.sql を既に実行した環境で適用してください。

BEGIN;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_join_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settlements TO authenticated;

COMMIT;
