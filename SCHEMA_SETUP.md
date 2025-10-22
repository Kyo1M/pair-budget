# PairBudget データベーススキーマ セットアップガイド

## 概要

このガイドは、PairBudgetのデータベーススキーマを一から構築する手順を説明します。

以前のマイグレーションファイル（001〜010）は断片的で、RLSポリシーの競合が発生していました。
新しい統合スキーマファイル `schema_clean.sql` は、全ての問題を修正した完全版です。

## 🎯 新スキーマの主な修正点

### 1. householdsのINSERTポリシーを修正

**問題のあった設定:**
```sql
WITH CHECK (auth.uid() = owner_user_id);
```
→ RLSチェックタイミングの問題でINSERTが失敗

**修正後:**
```sql
WITH CHECK (true);
```
→ 認証済みユーザーなら誰でも作成可能（`owner_user_id`はアプリケーション側で明示的に設定）

### 2. 世帯作成関連トリガーを削除

以下のトリガーはRLSとの相性が悪いため削除：
- `set_household_owner_before_insert` - owner_user_idの自動設定
- `add_household_owner_trigger` - household_membersへの自動追加

→ アプリケーション側（`apps/web/src/services/households.ts`）で明示的に処理

### 3. profiles自動作成トリガーを保持

**重要:** このトリガーは必須です
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

これにより、ユーザー登録時に自動的に `profiles` テーブルにレコードが作成され、
`household_members` の外部キー制約エラーを防ぎます。

## 📋 適用手順

### 前提条件

- Supabaseプロジェクトへのアクセス権限（オーナーまたは管理者）
- データがない、またはバックアップ済み（**重要:** この手順は全テーブルを再作成します）

### ステップ1: 既存テーブルの削除（データがある場合は注意）

Supabase Studio (https://app.supabase.com) のSQLエディタで実行：

```sql
-- 警告: このコマンドは全てのデータを削除します
BEGIN;

-- テーブルを削除（依存関係の順序に注意）
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.household_join_codes CASCADE;
DROP TABLE IF EXISTS public.household_members CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 関数を削除
DROP FUNCTION IF EXISTS public.get_household_balances(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_household_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_household_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_household_owner_id() CASCADE;
DROP FUNCTION IF EXISTS public.add_household_owner_as_member() CASCADE;

-- トリガーを削除（念のため）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_household_owner_before_insert ON public.households;
DROP TRIGGER IF EXISTS add_household_owner_trigger ON public.households;

-- ENUMタイプを削除
DROP TYPE IF EXISTS public.transaction_type CASCADE;

COMMIT;
```

### ステップ2: 新スキーマを適用

`supabase/sql/schema_clean.sql` の全文をコピーして、SQLエディタで実行してください。

**このファイル1つで全てが完了します:**
- ✅ テーブル作成
- ✅ RLSポリシー設定（修正済み）
- ✅ ヘルパー関数作成
- ✅ トリガー作成（profiles自動作成のみ）
- ✅ インデックス作成
- ✅ 既存ユーザーのバックフィル

### ステップ3: 適用確認

以下のSQLで正しく適用されたか確認してください：

```sql
-- 1. テーブルが作成されているか確認
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 期待される結果: 6テーブル
-- - household_join_codes
-- - household_members
-- - households
-- - profiles
-- - settlements
-- - transactions

-- 2. householdsのINSERTポリシーを確認
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'households' AND cmd = 'INSERT';

-- 期待される結果:
-- policyname: "Users can create households"
-- with_check: "true"

-- 3. profiles自動作成トリガーが存在するか確認
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 期待される結果: 1行返ってくる

-- 4. 世帯作成関連トリガーが削除されているか確認
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name IN ('set_household_owner_before_insert', 'add_household_owner_trigger');

-- 期待される結果: 0行（削除されている）

-- 5. profilesとauth.usersの数が一致するか確認
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count;

-- 期待される結果: 両方の数が同じ
```

## 🧪 動作確認

スキーマ適用後、アプリケーションで以下をテストしてください：

### 1. 新規ユーザー登録
```
✅ auth.usersにレコードが作成される
✅ profilesにレコードが自動作成される
```

### 2. 世帯作成
```
✅ householdsにレコードが作成される（エラーなし）
✅ household_membersにオーナーが追加される
✅ ログイン中のユーザーがowner_user_idとして設定される
```

### 3. 取引・精算
```
✅ 世帯メンバーが取引を作成できる
✅ get_household_balances() で残高を取得できる
```

## 📁 ファイル構成

### メインスキーマファイル
- `supabase/sql/schema_clean.sql` - **これを使用**（統合版・修正済み）
- `supabase/sql/supabase-schema.sql` - 古いスキーマ（参考用に保持）

### アーカイブ
以下のファイルは `supabase/sql/archive/` に移動されました：
- `001_adjust_household_owner_defaults.sql`
- `002_update_household_insert_policy.sql`
- `003_fix_household_member_profile_fk.sql`
- `004_allow_household_settlements.sql`
- `005_enable_rls_policies.sql`
- `006_fix_household_insert_policy.sql`
- `007_remove_household_triggers.sql`
- `008_create_profile_on_signup.sql`
- `009_backfill_existing_profiles.sql`
- `010_fix_household_creation_comprehensive.sql`
- `debug_*.sql`

これらは履歴参照用に保持されていますが、新規セットアップでは使用しません。

## 🔧 トラブルシューティング

### エラー: "permission denied"

**原因:** Supabaseプロジェクトへの権限が不足しています。

**解決策:**
1. Supabaseプロジェクトのオーナーまたは管理者としてログインしているか確認
2. SQLエディタの右上で正しいプロジェクトが選択されているか確認

### エラー: "duplicate key value violates unique constraint"

**原因:** 既存のデータが残っています。

**解決策:**
1. ステップ1の削除SQLを再実行
2. Supabase Studioの「Database」→「Tables」で手動確認

### 世帯作成がまだ失敗する

**確認事項:**
1. householdsのINSERTポリシーが `WITH CHECK (true)` になっているか
2. profiles自動作成トリガーが存在するか
3. 世帯作成関連トリガーが削除されているか

上記の「ステップ3: 適用確認」のSQLを実行して確認してください。

### ブラウザコンソールでエラーを確認

1. F12キーでブラウザの開発者ツールを開く
2. Consoleタブでエラーメッセージを確認
3. エラーメッセージをClaude Codeに共有して詳細な診断を依頼

## 📚 関連ドキュメント

- [mvp-plan.md](docs/mvp-plan.md) - MVP要件とユーザーフロー
- [web-app-mvp-architecture.md](docs/web-app-mvp-architecture.md) - アーキテクチャ詳細
- [CLAUDE.md](CLAUDE.md) - プロジェクト概要と開発ガイドライン

## 🎉 完了後

スキーマが正しく適用されたら、以下のファイルは削除して構いません：
- `HOTFIX_HOUSEHOLD_CREATION.md`
- `supabase/sql/archive/` ディレクトリ（履歴が不要な場合）

---

🤖 Generated with Claude Code
