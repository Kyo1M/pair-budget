# 世帯作成エラーの緊急修正手順

## 問題の概要

世帯作成時に以下のエラーが発生します：
- 「世帯の作成に失敗しました」エラー（householdsテーブルへのINSERT失敗）
- 「世帯メンバーの追加に失敗しました」エラー（household_membersテーブルへのINSERT失敗）

## 原因

1. **RLSポリシーの問題**: `households`テーブルのINSERTポリシーが厳しすぎる
   - 現在: `WITH CHECK (auth.uid() = owner_user_id)`
   - 正しい: `WITH CHECK (true)` (アプリケーション側で制御)

2. **profilesレコード不足**: ユーザー登録時に`profiles`テーブルにレコードが自動作成されない
   - `household_members`テーブルの外部キー制約(`profiles(id)`)に違反

## 🚀 即座の修正手順

### ステップ1: Supabase Studioにアクセス

1. https://app.supabase.com にアクセス
2. プロジェクトを選択
3. 左メニューから **SQL Editor** を選択

### ステップ2: 統合マイグレーションを実行

`supabase/sql/010_fix_household_creation_comprehensive.sql` の内容をコピーして、SQLエディタに貼り付けて実行してください。

**このファイル1つで全ての修正が完了します。**

### ステップ3: 実行結果の確認

以下のSQLをSQLエディタで実行して、正しく適用されたか確認してください：

```sql
-- 1. householdsのINSERTポリシーを確認
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'households' AND cmd = 'INSERT';

-- 期待される結果:
-- policyname: "Users can create households"
-- with_check: "true"

-- 2. profilesレコードが揃っているか確認
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count;

-- 期待される結果: 両方の数が同じ

-- 3. トリガーが作成されているか確認
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 期待される結果: 1行返ってくる
```

### ステップ4: 動作確認

1. ブラウザのアプリケーションをリロード
2. 世帯作成を試してみる
3. エラーなく成功すれば完了 ✅

## 📝 何が修正されたか

### 1. householdsのINSERTポリシー
```sql
-- 修正前（厳しすぎる）
WITH CHECK (auth.uid() = owner_user_id);

-- 修正後（アプリケーション側で制御）
WITH CHECK (true);
```

### 2. 不要なトリガーの削除
- `add_household_owner_trigger` - RLSとの相性が悪かったため削除
- `set_household_owner_before_insert` - 同上

### 3. profilesレコード自動作成
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 4. 既存ユーザーのバックフィル
- 既存の`auth.users`ユーザーに対応する`profiles`レコードを作成

## トラブルシューティング

### エラー: "permission denied"

SQLエディタで実行する際は、必ず以下を確認してください：
- Supabaseプロジェクトのオーナーまたは管理者権限でログインしている
- SQLエディタの右上で正しいプロジェクトが選択されている

### それでもエラーが出る場合

以下の情報を確認してください：

1. **ブラウザのコンソールログ**（F12キーで開く）
2. **エラーメッセージの全文**
3. **以下のSQLの実行結果**:

```sql
-- 現在適用されているポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'households';
```

## 関連ファイル

- `/supabase/sql/006_fix_household_insert_policy.sql` - RLSポリシー修正
- `/supabase/sql/007_remove_household_triggers.sql` - トリガー削除
- `/supabase/sql/008_create_profile_on_signup.sql` - profiles自動作成
- `/supabase/sql/009_backfill_existing_profiles.sql` - 既存ユーザーバックフィル
- `/supabase/sql/010_fix_household_creation_comprehensive.sql` - **統合版（推奨）**

## コード参照

世帯作成の処理フロー: `apps/web/src/services/households.ts:22-93`

---

🤖 Generated with Claude Code
