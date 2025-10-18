# ふたりの財布 MVP バックログ

## 0. 事前準備
- **PB-00:** Supabase プロジェクト新規作成と環境変数 (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` など) の収集。
- **PB-01:** `apps/web` に Next.js 14 (App Router) + TypeScript プロジェクトを `create-next-app` (pnpm 利用) で初期化し、ESLint/Prettier 設定を調整。
- **PB-02:** pnpm をベースにした monorepo ツールチェーンのセットアップ (ルート `package.json`, `pnpm-workspace.yaml`, lint scripts)。
- **PB-03:** Supabase CLI の導入 (`supabase/config.toml` 作成、`supabase/sql` 配置)。

## 1. 認証・基盤
- **PB-10:** Supabase schema を `supabase/sql/001_schema.sql` として配置し、マイグレーションコマンドを整備。
- **PB-11:** `supabase` クライアント初期化ユーティリティ (`apps/web/src/lib/supabaseClient.ts`) を実装。
- **PB-12:** `AuthProvider` と `useAuthStore` (Zustand) を実装し、セッション監視と初期化を行う。
- **PB-13:** `/auth` ルートの UI (サインアップ / ログインフォーム + バリデーション) を実装。

- **PB-20:** `useHouseholdStore` と Supabase service (`services/households.ts`) を実装。
- **PB-21:** ホーム画面で未世帯時に表示する `HouseholdSetupCard` を作成。
- **PB-22:** 世帯作成モーダル (`CreateHouseholdModal`) と API 呼び出しを実装。
- **PB-23:** メンバー招待モーダル (`InviteMemberModal`) を実装し、共有用 1 回限りの参加コード (例: 6 桁) を発行できるようにする。
- **PB-24:** 参加コードを入力して世帯に参加するフロー (`JoinHouseholdForm`) を `/auth` 完了後に案内し、コード検証 API を実装。

- **PB-30:** `useTransactionStore` / `services/transactions.ts` を構築し、最近の取引取得を実装。
- **PB-31:** ダッシュボード UI コンポーネント群 (`SummaryCards`, `RecentTransactions`) を実装。
- **PB-32:** FAB と `TransactionModal` (支出 / 収入 / 立替) を実装し、入力バリデーションを追加。
- **PB-33:** 立替残高をフロントエンドで集計しつつ `BalanceCard` に表示 (将来の RPC 移行を見据えたインターフェイスにする)。

## 3. ダッシュボード分析
- **PB-60:** 月次支出カテゴリ内訳を円グラフと凡例で可視化し、ダッシュボードの情報配置を再設計。
- **PB-61:** 年次ビューを実装し、年間の収入・支出サマリーと月次差額の棒グラフを表示。
- **PB-62:** 追加インサイト（トップカテゴリのテキスト表示、立替トグルなど）を提供しアクセシビリティと共有性を向上。

## 4. 精算機能
- **PB-40:** `useSettlementStore` / `services/settlements.ts` を作成し、残高再計算処理を実装。
- **PB-41:** 精算モーダル (`SettlementModal`) と UI を実装。
- **PB-42:** 立替残高表示に精算レコードを反映させる E2E テスト (Playwright など) を整備。

## 5. 開発体験・運用
- **PB-50:** ESLint + Prettier + Husky (pre-commit) の導入。
- **PB-51:** `apps/web` 用の Storybook または Ladle 導入検討 (UI 開発効率化)。
- **PB-52:** shadcn/ui のセットアップと UI コレクション同期フローをドキュメント化。
- **PB-53:** GitHub Actions (lint / test / build) のセットアップ。
- **PB-54:** README とアーキテクチャ図の更新。

- 招待コードの有効期限・再発行ルール (例: 24 時間で失効 / オーナーが再発行)。
- 立替残高が重くなった際の RPC 化タイミング。
