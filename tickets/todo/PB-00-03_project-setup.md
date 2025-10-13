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
- [ ] Supabase にアクセスして新規プロジェクトを作成
- [ ] プロジェクト名: `pair-budget-mvp`（または任意の名前）
- [ ] リージョン選択: Tokyo (ap-northeast-1) 推奨
- [ ] データベースパスワードを安全に保存
- [ ] Project Settings から以下の情報を収集:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (Settings > API > service_role key)

### 2. pnpm workspace のセットアップ (PB-02)
- [ ] ルートに `pnpm-workspace.yaml` を作成
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
- [ ] ルート `package.json` にワークスペーススクリプトを追加
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
- [ ] `.nvmrc` ファイルを作成（Node.js 20.x）
  ```
  20
  ```

### 3. Next.js プロジェクトの作成 (PB-01)
- [ ] 以下のコマンドで Next.js アプリを作成:
  ```bash
  pnpm dlx create-next-app@latest apps/web \
    --typescript \
    --eslint \
    --tailwind \
    --src-dir \
    --app \
    --import-alias "@/*"
  ```
- [ ] `apps/web/.gitkeep` を削除（不要になるため）
- [ ] ESLint と Prettier の設定を確認・調整
- [ ] `apps/web/.env.local` を作成（gitignore済み）
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  ```
- [ ] `apps/web/.env.example` を作成（コミット用）
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  ```

### 4. Supabase CLI のセットアップ (PB-03)
- [ ] Supabase CLI をインストール
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
- [ ] プロジェクトをリンク
  ```bash
  supabase link --project-ref your_project_ref
  ```

### 5. Supabase スキーマの適用
- [ ] `supabase/sql/supabase-schema.sql` の内容を確認
- [ ] Dry run でスキーマを確認
  ```bash
  supabase db push --config supabase/config.toml --dry-run
  ```
- [ ] スキーマを適用
  ```bash
  supabase db push --config supabase/config.toml
  ```
- [ ] Supabase Studio でテーブルが作成されているか確認

### 6. shadcn/ui のセットアップ
- [ ] shadcn/ui を初期化
  ```bash
  cd apps/web
  pnpm dlx shadcn-ui@latest init
  ```
- [ ] 必要なコンポーネントをインストール
  ```bash
  pnpm dlx shadcn-ui@latest add button
  pnpm dlx shadcn-ui@latest add input
  pnpm dlx shadcn-ui@latest add dialog
  pnpm dlx shadcn-ui@latest add card
  pnpm dlx shadcn-ui@latest add form
  pnpm dlx shadcn-ui@latest add label
  ```

### 7. 基本パッケージのインストール
- [ ] Supabase クライアントライブラリをインストール
  ```bash
  cd apps/web
  pnpm add @supabase/supabase-js
  pnpm add @supabase/auth-helpers-nextjs
  ```
- [ ] Zustand をインストール
  ```bash
  pnpm add zustand
  ```
- [ ] react-hook-form と zod をインストール
  ```bash
  pnpm add react-hook-form @hookform/resolvers zod
  ```

### 8. 動作確認
- [ ] 開発サーバーを起動
  ```bash
  pnpm dev
  ```
- [ ] http://localhost:3000 でアクセスできることを確認
- [ ] Lint が通ることを確認
  ```bash
  pnpm lint
  ```

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

