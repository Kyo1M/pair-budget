# PB-50-54: 開発体験と運用の整備

## 概要
ESLint、Prettier、テスト、CI/CDなど、開発体験を向上させるツールとワークフローを整備する。

## 関連バックログ
- PB-50: ESLint + Prettier + Husky の導入
- PB-51: Storybook または Ladle の導入検討
- PB-52: shadcn/ui のセットアップとドキュメント化
- PB-53: GitHub Actions のセットアップ
- PB-54: README とアーキテクチャ図の更新

## タスク

### 1. ESLint と Prettier の設定 (PB-50)
- [ ] `apps/web/.eslintrc.json` を更新
  - Next.js ベース設定
  - TypeScript strict ルール
  - Import order ルール
- [ ] `apps/web/.prettierrc` を作成
  ```json
  {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "tabWidth": 2,
    "printWidth": 100
  }
  ```
- [ ] `apps/web/.prettierignore` を作成
- [ ] VSCode 設定の追加 `.vscode/settings.json`
  - Format on save
  - ESLint auto fix

### 2. Husky と lint-staged の導入 (PB-50)
- [ ] Husky をインストール
  ```bash
  pnpm add -D -w husky lint-staged
  pnpm exec husky init
  ```
- [ ] `.husky/pre-commit` を作成
  ```bash
  pnpm exec lint-staged
  ```
- [ ] `package.json` に lint-staged 設定を追加
  ```json
  {
    "lint-staged": {
      "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
      "*.{json,md}": ["prettier --write"]
    }
  }
  ```

### 3. Vitest のセットアップ (PB-50)
- [ ] Vitest と Testing Library をインストール
  ```bash
  cd apps/web
  pnpm add -D vitest @testing-library/react @testing-library/jest-dom
  pnpm add -D @vitejs/plugin-react
  ```
- [ ] `apps/web/vitest.config.ts` を作成
- [ ] `apps/web/src/test/setup.ts` を作成
  - Testing Library のセットアップ
  - Supabase クライアントのモック
- [ ] サンプルテストを作成
  - `apps/web/src/components/__tests__/example.test.tsx`

### 4. テストスクリプトの追加
- [ ] `apps/web/package.json` にスクリプト追加
  ```json
  {
    "scripts": {
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:coverage": "vitest --coverage"
    }
  }
  ```

### 5. Storybook / Ladle の検討 (PB-51)
- [ ] Ladle を試験的に導入（Storybook より軽量）
  ```bash
  cd apps/web
  pnpm add -D @ladle/react
  ```
- [ ] `apps/web/.ladle/config.mjs` を作成
- [ ] サンプルストーリーを作成
  - `apps/web/src/components/ui/Button.stories.tsx`
- [ ] 必要性を検証し、不要なら削除

### 6. shadcn/ui のドキュメント化 (PB-52)
- [ ] `docs/ui-components.md` を作成
  - インストール済みコンポーネントのリスト
  - カスタマイズ方法
  - 追加コンポーネントの導入手順
- [ ] コンポーネントの使用例をドキュメント化

### 7. GitHub Actions の設定 (PB-53)
- [ ] `.github/workflows/ci.yml` を作成
  - トリガー: push, pull_request (main, develop)
  - ジョブ:
    - Lint チェック
    - Type チェック
    - テスト実行
    - ビルド確認
- [ ] Node.js バージョンマトリクス（20.x）
- [ ] キャッシュ設定（pnpm）

### 8. CI ワークフローの詳細設定
- [ ] Lint ジョブ
  ```yaml
  - name: Run ESLint
    run: pnpm --filter web lint
  ```
- [ ] Type チェックジョブ
  ```yaml
  - name: Type check
    run: pnpm --filter web type-check
  ```
- [ ] テストジョブ
  ```yaml
  - name: Run tests
    run: pnpm --filter web test --run
  ```
- [ ] ビルドジョブ
  ```yaml
  - name: Build
    run: pnpm --filter web build
  ```

### 9. README の更新 (PB-54)
- [ ] ルート `README.md` を更新
  - プロジェクト概要
  - 技術スタック
  - セットアップ手順
  - 開発コマンド
  - ディレクトリ構成
  - コントリビューションガイド
- [ ] `apps/web/README.md` を作成
  - Next.js アプリ固有の情報

### 10. アーキテクチャ図の作成 (PB-54)
- [ ] `docs/architecture-diagram.md` を作成
  - システム構成図（Mermaid）
  - データフロー図
  - 認証フロー図
  - 立替・精算フロー図
- [ ] Mermaid 図の埋め込み

### 11. コントリビューションガイド
- [ ] `CONTRIBUTING.md` を作成
  - ブランチ戦略
  - コミットメッセージ規約
  - PR テンプレート
  - コードレビューガイドライン

### 12. Issue / PR テンプレート
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` を作成
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` を作成
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` を作成

### 13. 環境変数のドキュメント化
- [ ] `docs/environment-variables.md` を作成
  - 必須環境変数のリスト
  - 取得方法
  - ローカル開発用設定

### 14. デプロイ準備
- [ ] Vercel デプロイ設定のドキュメント化
- [ ] 環境変数の設定手順
- [ ] ビルドコマンドの確認

## 関連ファイル
- `apps/web/.eslintrc.json`
- `apps/web/.prettierrc`
- `apps/web/.prettierignore`
- `.vscode/settings.json`
- `.husky/pre-commit`
- `package.json`
- `apps/web/vitest.config.ts`
- `apps/web/src/test/setup.ts`
- `.github/workflows/ci.yml`
- `README.md`
- `apps/web/README.md`
- `docs/architecture-diagram.md`
- `docs/ui-components.md`
- `docs/environment-variables.md`
- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/`
- `.github/PULL_REQUEST_TEMPLATE.md`

## 更新履歴
- 2025-10-13: チケット作成

