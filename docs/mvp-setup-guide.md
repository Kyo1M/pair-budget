# ふたりの財布 MVP 開発セットアップガイド

最小構成の Next.js + Supabase アプリを短期間で立ち上げるための準備事項をまとめる。開発開始前の合意形成と、オンボーディング時のチェックリストとして利用する。

## 1. リポジトリ構成の方針

```
pair-budget/
├── apps/
│   └── web/                 # Next.js アプリ (後で create-next-app で初期化)
├── docs/                    # 要件・アーキテクチャ資料
├── supabase/
│   └── sql/                 # マイグレーションファイル配置予定地
├── package.json             # ルートスクリプト (pnpm 用)
├── pnpm-workspace.yaml      # ワークスペース定義
└── supabase/config.toml     # Supabase CLI 設定 (PB-03)
```

- 共通ロジックが増えた場合は `packages/` にライブラリを切り出す想定。
- Next.js 側は App Router / TypeScript / ESLint / Prettier / shadcn/ui を標準採用する。

## 2. 開発ツールとバージョン

- **Node.js**: 20.x (LTS) を `.nvmrc` で固定予定 (PB-01)。
- **パッケージマネージャー**: pnpm 8 系。
- **Supabase CLI**: 1.150 以降。ローカル開発では `supabase start` を使用せず、ホスティング済みプロジェクトに対して `supabase db push` を利用する前提。
- **UI ライブラリ**: shadcn/ui。`pnpm dlx shadcn-ui@latest init` でセットアップし、必要なコンポーネントを import する。
- **状態管理**: Zustand + React Query (オプション)。
- **Lint/Format**: ESLint (Next.js ベース) + Prettier + Husky pre-commit。
- **テスト**: Vitest + Testing Library を候補 (PB-50 の一環で決定)。

## 3. 環境変数とシークレット管理

| キー | 用途 | 設定場所 |
|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | `apps/web/.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | `apps/web/.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーサイド API 用 | Supabase CLI / Vercel env secrets |
| `NEXTAUTH_SECRET` (予定) | 認証用シークレット (必要な場合) | デプロイ環境 |
| `JOIN_CODE_LENGTH` (任意) | 参加コード桁数を環境で制御したい場合 | `apps/web/.env` |

- ローカルでは `apps/web/.env.local` にまとめ、`.env.example` をコミットして共有する。
- Supabase Edge Function や Route Handler を利用する場合は、Resend 等の外部キーを追加する際も同様の運用とする。

## 4. Supabase スキーマ運用

- `docs/supabase-schema.sql` を元に `supabase/sql/001_schema.sql` を作成し、CLI から `supabase db push` で反映 (PB-10)。
- 参加コードは `household_join_codes` テーブルで管理し、`generateJoinCode` / `consumeJoinCode` 用の RPC またはサービス層を後続で整備する。
- RLS ポリシーは原則 `is_household_member` / `is_household_owner` で制御。参加コード検証用の Security Definer Function を追加する場合、`supabase/sql/` に別ファイルで管理する。

## 5. Git ワークフロー

- ベースブランチ: `develop`。機能ごとに `feature/<topic>` ブランチを作成 (例: `feature/auth-flow`)。
- コミットメッセージは Conventional Commits ライクに `feat:`, `chore:`, `docs:` などで始める。
- Pull Request テンプレート (PB-50) を準備し、バックログ番号 (PB-xx) と Supabase マイグレーション ID を記載。
- ドキュメント変更のみの場合も PR を通すが、レビューフローは簡略化してよい。

## 6. 初期セットアップ手順 (PB-00〜PB-03)

1. Supabase プロジェクトを作成し、Anon / Service Role key を取得（PB-00）。
2. `pnpm` をインストールし、`pnpm init` + `pnpm-workspace.yaml` でルートを整える（PB-02 同時）。
3. `pnpm dlx create-next-app@latest apps/web --use-pnpm --typescript --eslint --src-dir --app` でアプリを生成。
4. Supabase CLI を導入し、`supabase/config.toml` を作成。`docs/supabase-schema.sql` をベースにマイグレーションファイルを配置（PB-03/10）。
5. shadcn/ui を初期化し、Button / Dialog / Input など MVP で必須のコンポーネントをインポート。

## 7. 参加コードの基本仕様

- コードは 6 桁の大文字英数字（紛らわしい文字を除外: O/0, I/1/l など）。
- ステータス: `active` / `used` / `expired` / `revoked`。
- デフォルト有効期限: 24 時間。期限切れまたは `used` の場合は再生成が必要。
- コードを使用したユーザーは `household_members` に `member` ロールで追加し、`used_by` / `used_at` を更新する。
- MVP時点ではrate limitingは実装せず、有効期限のみで制御する。

## 8. UI/UX ガイドライン

- shadcn/ui のカラーパレットをベースにしつつ、「ふたりの財布」をイメージしたペールカラー + 強調色 (例: 温かいオレンジ) をテーマに採用。
- FAB はモバイルファーストを意識し、優先アクション（支出・収入・精算）を 3 つまで表示。
- フォームは `react-hook-form` + Zod バリデーションを利用する方針 (PB-32)。
- 国際化は MVP では想定せず、日本語 UI を前提とする。

## 9. QA / テスト戦略 (初期案)

- 単体テスト: Zustand ストアとサービス層に対して Vitest でカバレッジ確保。
- E2E テスト: 将来的に Playwright を導入し、参加コード発行→参加→取引登録→残高更新のハッピーパスを検証 (PB-42)。
- Lint / Type Check / Test を CI (PB-53) で自動実行し、Pull Request にステータスを表示。

## 10. カテゴリ定義 (MVP)

固定カテゴリリスト（将来的にカスタマイズ可能にする想定）:
- 食費
- 外食費
- 日用品
- 医療費
- 家具・家電
- 子ども
- その他

## 11. 立替の仕様

- 立替は2種類のパターンをサポート:
  - **家庭全体への立替**: `advance_to_user_id` = NULL
    - 本来世帯の共同支出として出すべきものを一時的に立て替えている状態
    - 立て替えた金額がそのまま立替残高に加算され、精算時に返してもらう
    - 例: PC 20万円を夫が立て替え → 夫の立替残高 +20万円 → 妻が精算で20万円支払い → 残高 0円
  - **特定の相手への立替**: `advance_to_user_id` = 相手のユーザーID
    - 相手の個人的な支出を立て替えた状態
    - 同様に、立て替えた金額を返してもらう
    - 例: 妻の買い物5万円を夫が立て替え → 夫の立替残高 +5万円 → 妻が精算で5万円支払い → 残高 0円
- 2つのパターンの違いは、記録・分類の目的（家庭の支出か個人の支出か）であり、精算方法は同じ。
- 立替残高は `get_household_balances(household_id)` RPC関数で算出する。

## 12. 今後決めるべき事項

- Supabase Edge Function を採用するか、Next.js Route Handler で完結させるかの最終判断 (PB-24)。
- デプロイ先 (Vercel + Supabase Hosting の組み合わせを想定)。
- 参加コード生成時の rate limiting 実装タイミング。

このガイドをベースに、`docs/mvp-backlog.md` と併せて作業チケットを管理しながら MVP 実装を進める。
