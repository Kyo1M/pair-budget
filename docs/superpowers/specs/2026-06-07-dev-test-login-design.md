# ローカル開発用テストログイン & seed 設計

- 日付: 2026-06-07
- ブランチ: `feature/dev-test-login`
- 起点: `main`

## 背景・課題

ローカル開発時、`middleware.ts` が全ルートを認証ガードしており、ログインしないと画面を確認できない。
さらに全データは Supabase の RLS 下にあるため、**単に「ログイン不要」にしても有効なセッションが無いとデータが返らず空画面になる**。

接続先は**ホスト型 Supabase**（`*.supabase.co`）。ローカル Supabase 設定（`supabase/config.toml`）は存在するが未使用。

## ゴール

ローカルで「実データを含む画面全体」を最小手数で確認できるようにする。
**本番（Vercel）では一切無効化されること**を必須とする。

## 採用方針

dev 専用のクイックログインボタン + 自動 seed スクリプト（ホスト型 DB に専用テスト世帯）。

- 実在のテストユーザーで `signInWithPassword` を実行 → 本物のセッションが張られ RLS を満たす。
- **middleware・本番認証フローには一切手を入れない**（認証バイパスではなく「正規ログインの省力化」）。

### 却下した案
- **middleware バイパス**: RLS でデータが返らず空画面になり、目的（実データ確認）を満たさない。
- **ローカル Supabase + seed**: 隔離性は高いが Docker 起動が必要。今回は「ホスト型に専用世帯」を選択。

## 前提（確認済みスキーマ事実）

- `on_auth_user_created` トリガー → `handle_new_user()` が auth ユーザー作成時に `profiles` を自動生成
  （`raw_user_meta_data->>'name'` を name に採用）。**seed で profiles を直接挿入する必要は無い。**
- `household_members.user_id` は `profiles(id)` を参照。`role` は `'owner' | 'member'`。
- `transactions` カラム: `household_id, type(enum: expense|income|advance), amount(>0), occurred_on(date), category, note, payer_user_id, advance_to_user_id, created_by`。
- `settlements` カラム: `household_id, from_user_id, to_user_id, amount(>0), settled_on(date), note, created_by`。
- ログイン後遷移パターン（既存 SignInForm 準拠）: `router.push('/'); router.refresh();`。

## コンポーネント設計

### 1. seed スクリプト `apps/web/scripts/seed-test-data.ts`

- `.env.local` から `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を読み込む（`dotenv`）。
- service role クライアントで以下を冪等に投入:
  1. テストユーザー2名（夫婦）を `auth.admin.createUser({ email_confirm: true, user_metadata: { name } })` で作成
     - 太郎: `test-taro@example.com`（owner）
     - 花子: `test-hanako@example.com`（member）
     - 既存なら作成せず取得（list でメールを引く）。
     - profiles はトリガーが自動生成。
  2. 固定 UUID の「テスト世帯」を find-or-create（`owner_user_id` = 太郎）。
  3. `household_members` に太郎(owner)・花子(member) を upsert（`UNIQUE(household_id, user_id)` 利用）。
  4. 代表的な取引を投入:
     - 各カテゴリ（食費/外食費/日用品/医療費/家具・家電/子ども/その他）の支出を数件
     - 収入を数件
     - 世帯立替（`advance_to_user_id = NULL`）1件、個人立替（`advance_to_user_id` 指定）1件
     - 精算 1件
- **冪等性**: テスト世帯を固定 UUID で特定し、再実行時はその世帯の `transactions` / `settlements` を削除してから再投入。何度でも同じ状態に戻せる。
- `--dry-run` フラグ: 投入内容をログ出力するのみで DB を変更しない。
- 実行: `pnpm --filter web seed:test`（`package.json` に `"seed:test": "tsx scripts/seed-test-data.ts"` を追加、`tsx` を devDependency に追加）。
- このスクリプトはアプリ本体から import されない（手動実行のみ）。

### 2. dev クイックログイン UI `apps/web/src/components/auth/DevLoginButton.tsx`

- `'use client'`。表示ガード: `process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'` のときのみレンダリング。false/未設定なら `null` を返す。
- 「テスト太郎でログイン」「テスト花子でログイン」の2ボタン（2人精算フロー確認のため）。
- クリックで `useAuthStore.signIn(email, password)` → 成功後 `router.push('/'); router.refresh();`。
- 資格情報は `NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL` / `..._TARO_PASSWORD` / `..._HANAKO_EMAIL` / `..._HANAKO_PASSWORD` から取得。
- `/auth` の SignInForm 下に区切り線付きで差し込む（`app/auth/page.tsx` の signin タブ内）。

### 3. env / ドキュメント

- 不足している `apps/web/.env.example` を新規作成し、全キーを placeholder 付きで記載:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_ENABLE_DEV_LOGIN`, `NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL/PASSWORD`, `NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL/PASSWORD`
- CLAUDE.md（または README）に「`pnpm seed:test` → `pnpm dev` → /auth でテストログイン」のローカル手順とテストアカウント削除手順を追記。

## データフロー

1. `pnpm --filter web seed:test`（初回のみ）→ テストユーザー・世帯・サンプルデータが投入される。
2. `pnpm --filter web dev` で起動、`/auth` を開く。
3. `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` なので「テスト太郎/花子でログイン」ボタンが表示。
4. クリック → 実セッション発行 → middleware を正規通過 → 実データ付きダッシュボード表示。

## 本番安全性（最重要）

- dev-login 関連コードは全て `NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'` ガード下。
- Vercel ではこの変数も資格情報変数も**未設定** → ボタンは描画されず、`process.env.NEXT_PUBLIC_*` はビルド時に `undefined` として inline されるため資格情報はバンドルに漏れない。
- `middleware.ts` は無改変 → 認証バイパスは存在しない。
- seed スクリプトは `SUPABASE_SERVICE_ROLE_KEY` を要求し手動実行のみ。アプリから import しない。
- テストアカウントは `@example.com` + 専用世帯で識別可能。削除手順をドキュメント化。

## テスト方針

- `DevLoginButton.test.tsx`（Vitest + RTL）:
  - フラグ on で2ボタンが描画される / off で `null`（何も描画しない）。
  - ボタンクリックで `signIn` が正しい資格情報で呼ばれる（`useAuthStore`・`next/navigation` をモック）。
- seed スクリプトはネットワーク依存のため単体テスト対象外。`--dry-run` で投入内容を検証可能にする。

## 影響範囲（変更/新規ファイル）

- 新規: `apps/web/scripts/seed-test-data.ts`
- 新規: `apps/web/src/components/auth/DevLoginButton.tsx`
- 新規: `apps/web/src/components/auth/DevLoginButton.test.tsx`
- 新規: `apps/web/.env.example`
- 変更: `apps/web/src/app/auth/page.tsx`（DevLoginButton 差し込み）
- 変更: `apps/web/package.json`（`seed:test` script + `tsx` devDependency）
- 変更: `CLAUDE.md` または `README`（ローカル手順追記）
- 変更: `apps/web/.env.local`（dev-login 用キーを追加。コミット対象外）

## 未確定・実装時に確認する点

- `tsx` を使うか `node --import tsx` 形式にするか（pnpm 環境で動く方を採用）。
- サンプル取引の件数・金額の具体値（実装時に「それらしい」値を設定）。
- テスト世帯の固定 UUID 値の決定。
