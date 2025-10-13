# PB-00-03: プロジェクトセットアップ

## 概要
Supabaseプロジェクトの作成、Next.js 14 (App Router) のセットアップ、pnpm workspaceの構築を行う。

## 関連バックログ
- PB-00: Supabase プロジェクト新規作成と環境変数の収集
- PB-01: Next.js 14 (App Router) + TypeScript プロジェクトの初期化
- PB-02: pnpm monorepo ツールチェーンのセットアップ
- PB-03: Supabase CLI の導入

## タスク

### 1. Supabase プロジェクトの作成 (PB-00)
- [x] Supabase にアクセスして新規プロジェクトを作成（ユーザー対応済み）
- [x] プロジェクト名: `pair-budget-mvp`（または任意の名前）
- [x] リージョン選択: Tokyo (ap-northeast-1) 推奨
- [x] データベースパスワードを安全に保存
- [ ] Project Settings から以下の情報を収集:（ユーザーが対応予定）
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (Settings > API > service_role key)

### 2. pnpm workspace のセットアップ (PB-02)
- [x] ルートに `pnpm-workspace.yaml` を作成
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
- [x] ルート `package.json` にワークスペーススクリプトを追加
  ```json
  {
    "name": "pair-budget",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "pnpm --filter web dev",
      "build": "pnpm --filter web build",
      "lint": "pnpm --filter web lint",
      "test": "pnpm --filter web test"
    }
  }
  ```
- [x] `.nvmrc` ファイルを作成（Node.js 20.x）
  ```
  20
  ```

### 3. Next.js プロジェクトの作成 (PB-01)
- [x] 以下のコマンドで Next.js アプリを作成:
  ```bash
  pnpm dlx create-next-app@latest apps/web \
    --typescript \
    --eslint \
    --tailwind \
    --src-dir \
    --app \
    --import-alias "@/*"
  ```
- [x] `apps/web/.gitkeep` を削除（不要になるため）
- [x] ESLint と Prettier の設定を確認・調整
- [ ] `apps/web/.env.local` を作成（gitignore済み）（ユーザーが対応予定）
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  ```
- [x] `apps/web/.env.example` を作成（コミット用）
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  ```

### 4. Supabase CLI のセットアップ (PB-03)
- [x] Supabase CLI をインストール（既にインストール済み）
  ```bash
  brew install supabase/tap/supabase
  ```
- [ ] `supabase/config.toml` を作成
  ```toml
  project_id = "your_project_id"
  
  [api]
  enabled = true
  port = 54321
  
  [db]
  port = 54322
  
  [studio]
  enabled = true
  port = 54323
  ```
- [ ] Supabase にログイン
  ```bash
  supabase login
  ```
- [x] プロジェクトをリンク
  ```bash
  supabase link --project-ref your_project_ref
  ```

### 5. Supabase スキーマの適用
- [x] `supabase/sql/supabase-schema.sql` の内容を確認
- [x] Supabase Studio SQL Editorでスキーマを実行（CLI接続エラーのため）
  ```bash
  supabase db push --config supabase/config.toml --dry-run
  ```
- [ ] スキーマを適用
  ```bash
  supabase db push --config supabase/config.toml
  ```
- [x] Supabase Studio でテーブルが作成されているか確認

### 6. shadcn/ui のセットアップ
- [x] shadcn/ui を初期化
  ```bash
  cd apps/web
  pnpm dlx shadcn-ui@latest init
  ```
- [x] 必要なコンポーネントをインストール
  ```bash
  pnpm dlx shadcn-ui@latest add button
  pnpm dlx shadcn-ui@latest add input
  pnpm dlx shadcn-ui@latest add dialog
  pnpm dlx shadcn-ui@latest add card
  pnpm dlx shadcn-ui@latest add form
  pnpm dlx shadcn-ui@latest add label
  ```

### 7. 基本パッケージのインストール
- [x] Supabase クライアントライブラリをインストール（@supabase/ssr を使用）
  ```bash
  cd apps/web
  pnpm add @supabase/supabase-js
  pnpm add @supabase/ssr
  ```
- [x] Zustand をインストール
  ```bash
  pnpm add zustand
  ```
- [x] react-hook-form と zod をインストール
  ```bash
  pnpm add react-hook-form @hookform/resolvers zod
  ```

### 8. 動作確認
- [x] 開発サーバーを起動
  ```bash
  pnpm dev
  ```
- [x] http://localhost:3000 でアクセスできることを確認
- [x] Lint が通ることを確認
- [x] Type check が通ることを確認

## 関連ファイル
- `pnpm-workspace.yaml`
- `package.json`
- `.nvmrc`
- `apps/web/package.json`
- `apps/web/.env.local`
- `apps/web/.env.example`
- `supabase/config.toml`
- `supabase/sql/supabase-schema.sql`

## 更新履歴
- 2025-10-13: チケット作成
- 2025-10-13: pnpm workspace、Next.js、shadcn/ui、基本パッケージのセットアップ完了
  - @supabase/ssr を使用（@supabase/auth-helpers-nextjs は非推奨のため）
  - sonner を使用（toast は非推奨のため）
  - Supabase環境変数の設定はユーザーが対応済み
- 2025-10-13: Supabaseプロジェクトのリンクとスキーマ適用完了
  - supabase init でconfig.toml作成
  - supabase link でプロジェクトをリンク
  - CLI接続エラーのため、Supabase Studio SQL Editorでスキーマを直接実行
  - 全テーブル、関数、RLSポリシーの作成完了

