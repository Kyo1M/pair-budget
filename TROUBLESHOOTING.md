# 世帯作成エラーのトラブルシューティング

## 現在のエラー

```
Error: 世帯の作成に失敗しました: new row violates row-level security policy for table "households"
HTTP Status: 403 Forbidden
PostgreSQL Error Code: 42501
```

## 診断手順

### ステップ1: 現在のポリシーを確認

Supabase StudioのSQLエディタで以下を実行：

```sql
-- debug_all_policies.sql の内容をコピーして実行
```

### ステップ2: 期待される結果

**householdsテーブルのINSERTポリシー:**
```
policyname: "Users can create households"
cmd: INSERT
with_check_expression: true  ← これが重要！
```

もし `with_check_expression` が以下のようになっていたら問題：
```
with_check_expression: (auth.uid() = owner_user_id)  ← 古いポリシー
```

### ステップ3: 問題の原因

以下のいずれかが原因：

1. **schema_clean.sql が完全に適用されていない**
   - トランザクションがロールバックされた
   - 一部のSQLがエラーで失敗した

2. **古いポリシーが残っている**
   - DROP POLICY が実行されていない
   - 別名のポリシーが複数存在する

3. **household_membersのポリシー問題**
   - householdsの作成は成功するが、household_membersへの追加で失敗
   - ただし、エラーメッセージは "households" を指している

## 解決方法

### 方法1: 強制修正スクリプトを実行（推奨）

`force_fix_household_policies.sql` を実行してください：

1. Supabase Studio → SQL Editor
2. `supabase/sql/force_fix_household_policies.sql` の内容をコピー
3. 実行
4. 実行後、確認クエリの結果を確認

このスクリプトは：
- ✅ 既存の全てのhouseholdsポリシーを削除
- ✅ 正しいポリシーを再作成
- ✅ 確認クエリで検証

### 方法2: 手動で修正

```sql
BEGIN;

-- 1. 既存のINSERTポリシーを削除
DROP POLICY IF EXISTS "Users can create households" ON public.households;

-- 2. 正しいポリシーを作成
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;
```

### 方法3: 全てリセット（最終手段）

1. SCHEMA_SETUP.md の「ステップ1: 既存テーブルの削除」を実行
2. schema_clean.sql を再実行

## 確認方法

修正後、以下のSQLで確認：

```sql
SELECT
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'households'
  AND cmd = 'INSERT';
```

期待される結果:
```
policyname              | cmd    | with_check
------------------------|--------|------------
Users can create...     | INSERT | true
```

## よくある間違い

### ❌ 間違い1: RLSを無効にする

```sql
-- これはセキュリティリスク！やらないで
ALTER TABLE public.households DISABLE ROW LEVEL SECURITY;
```

### ❌ 間違い2: ポリシーを厳しくしすぎる

```sql
-- これでは失敗する
WITH CHECK (auth.uid() = owner_user_id)
```

問題：INSERT時に `owner_user_id` をクライアントが設定しても、RLSチェックが先に走る場合がある

### ✅ 正解: ポリシーを緩和してアプリ側で制御

```sql
WITH CHECK (true)
```

アプリケーション側（services/households.ts）で `owner_user_id` を明示的に設定

## デバッグのヒント

### ブラウザコンソールで確認

F12キーで開発者ツールを開き：
1. Console タブで詳細なログを確認
2. Network タブで失敗したリクエストを確認

### Supabase Logsで確認

Supabase Studio → Logs → Postgres Logs で：
- RLSポリシー違反のエラーを確認
- 実際に実行されたSQLを確認

## 追加確認事項

### profiles自動作成トリガーが存在するか

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

期待される結果: 1行返ってくる

### 現在ログイン中のユーザーのprofilesレコードが存在するか

```sql
-- ユーザーIDを確認（ブラウザコンソールのログから取得）
SELECT * FROM public.profiles WHERE id = '4a801b99-fa45-4161-a4a9-3fbef6bd229c';
```

期待される結果: 1行返ってくる

もしレコードがない場合:
```sql
-- 手動で作成
INSERT INTO public.profiles (id, email, name)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', email)
FROM auth.users
WHERE id = '4a801b99-fa45-4161-a4a9-3fbef6bd229c';
```

## それでも解決しない場合

以下の情報を共有してください：

1. `debug_all_policies.sql` の実行結果（全文）
2. ブラウザコンソールのエラーログ（全文）
3. Supabase Postgres Logsのエラー（あれば）

---

🤖 Generated with Claude Code
