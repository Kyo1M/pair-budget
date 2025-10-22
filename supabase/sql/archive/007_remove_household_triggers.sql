-- 007_remove_household_triggers.sql
-- householdsテーブルのトリガーを削除
-- アプリケーション側で世帯作成とメンバー追加を明示的に処理するため

BEGIN;

-- AFTER INSERTトリガーを削除（household_membersへの自動追加）
DROP TRIGGER IF EXISTS add_household_owner_trigger ON public.households;

-- BEFORE INSERTトリガーを削除（owner_user_idの自動設定）
DROP TRIGGER IF EXISTS set_household_owner_before_insert ON public.households;

-- トリガー関数も削除
DROP FUNCTION IF EXISTS public.add_household_owner_as_member();
DROP FUNCTION IF EXISTS public.set_household_owner_id();

COMMIT;

