# PB-60-62: ダッシュボード分析機能の拡張

## 概要
月次ダッシュボードに支出カテゴリの可視化を追加しつつ、年次サマリーと差額推移の確認機能を提供する。あわせて将来的に有用なインサイト拡張案を整理する。

## 関連バックログ
- PB-60: 月次カテゴリ内訳チャートとダッシュボード再構成
- PB-61: 年次サマリー表示と月次差額棒グラフの実装
- PB-62: 追加インサイト（テキストアクセシビリティ／エクスポート機能）検討

## タスク

### 1. 月次カテゴリ内訳チャートの実装 (PB-60)
- [ ] チャートライブラリを導入（`apps/web` に `recharts` を追加し、型定義も含めて設定）
- [ ] 月次支出カテゴリ合計を算出するユーティリティを追加
  - `@/store/useDashboardStore` から `transactions` を参照するか、専用フックで算出
  - 支出 (`expense`) のみを対象とし、立替 (`advance`) の扱いを関数引数で切り替えられるようにする
- [ ] `apps/web/src/components/dashboard/MonthlyCategoryBreakdown.tsx` を作成
  - 円グラフ + 凡例 + 合計値表示
  - 取引がない場合のプレースホルダー表示
  - ローディングスケルトンを実装
- [ ] カテゴリカラーは `@/constants/categories` の `colorClass` を基に `chart` 用カラーへ変換
  - テンプレートリテラルで `text-*` → `bg-*` 変換を行っている既存実装の重複を整理
- [ ] `apps/web/src/app/page.tsx` のレイアウトを調整
  - Summary → MonthlyCategoryBreakdown → BalanceCard の順で並べ、`RecentTransactions` はページ下部にフル幅で配置
  - スモールスクリーンでも縦積みで閲覧しやすいように spacing を調整
- [ ] 取引モーダル完了後にカテゴリ内訳が即時再計算されることを確認
- [ ] ユニットテストを追加
  - `apps/web/src/store/__tests__/dashboard-summary.test.ts`（カテゴリ集計ユーティリティ）
  - `apps/web/src/components/dashboard/__tests__/MonthlyCategoryBreakdown.test.tsx`
- [ ] ドキュメント更新
  - `docs/mvp-plan.md` にダッシュボード改善のアウトラインを追記

### 2. 年次サマリーと差額棒グラフの実装 (PB-61)
- [ ] 期間選択 UI をタブ化
  - `@radix-ui/react-tabs` で「月次 / 年次」を切り替え
  - `DashboardHeader` は月次選択 UI を維持しつつ、年次タブでは年移動ボタンを表示するよう拡張
- [ ] 年次サマリー取得ロジックを実装
  - `apps/web/src/store/useYearlyDashboardStore.ts`（新規）で `selectedYear`, `summary`, `monthlyDifferences` を管理
  - `services/transactions.ts` に期間指定（年単位）の取得 API を追加（`getTransactionsByRange` など）
  - 取得した取引をフロントで集計し、月次差額（収入 - 支出）配列を生成
- [ ] `YearlySummaryCards` コンポーネントを作成
  - 年間の収入 / 支出 / 差額を中央揃えで表示
  - 月次サマリーカードとスタイルを揃える
- [ ] `YearlyBalanceChart` コンポーネントを作成
  - 月ごとの差額を棒グラフで表示（プラスはエメラルド、マイナスはローズ）
  - ホバー時にツールチップで金額を表示
  - データがない月は 0 として扱い、ヒューマンリーダブルなラベルを付与
- [ ] コントロール類の動線を整理
  - 年次タブ選択時は最新年をデフォルト表示
  - 年の変更でデータ再取得、ローディングインジケータを表示
- [ ] エラー／空データ時のハンドリング
  - `toast` 通知とカード内の案内メッセージ
- [ ] ユニットテスト／ストアテスト
  - 年次集計ユーティリティの検証
  - `useYearlyDashboardStore` のロードフローをモック化したテスト
- [ ] UI スクリーンショットまたは GIF をチケットに添付できるよう撮影

### 3. 追加インサイト（推奨機能）の検討と実装 (PB-62)
- [ ] 月次カテゴリ内訳のテキスト表示を補完
  - `TopSpendingCategories` コンポーネントで上位3カテゴリと前月比をリスト表示
  - グラフが見づらいユーザー向けのアクセシビリティ改善
- [ ] CSV エクスポート機能を追加
  - 現在選択中の月／年の取引を CSV としてダウンロードできるボタンを `RecentTransactions` の近くに配置
  - `services/transactions.ts` に CSV 生成ヘルパーを追加し、`Blob` をクライアントで生成
- [ ] 立替 (`advance`) を集計から除外／含めるトグルを UI に追加
  - `MonthlyCategoryBreakdown` と `YearlyBalanceChart` の集計関数が同じフラグを参照できるようリファクタリング
  - 選択状態は `localStorage` に保存し、Mac Safari でも動作することを確認
- [ ] これら追加機能の利用ガイドを `docs/dashboard-insights.md` として作成

## 質問
- 立替 (`advance`) 取引は支出集計から除外した方が良いか（現状は支出扱い）
- 年次ビューの初期表示は「当年」固定で良いか、月次で選択した月の年を基準にすべきか
- CSV エクスポートのフォーマット要件（ヘッダー言語・日付フォーマット・文字コード）は UTF-8 / カンマ区切りで問題ないか

## 関連ファイル
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/dashboard/MonthlyCategoryBreakdown.tsx`
- `apps/web/src/components/dashboard/YearlySummaryCards.tsx`
- `apps/web/src/components/dashboard/YearlyBalanceChart.tsx`
- `apps/web/src/components/dashboard/TopSpendingCategories.tsx`
- `apps/web/src/store/useDashboardStore.ts`
- `apps/web/src/store/useYearlyDashboardStore.ts`
- `apps/web/src/services/transactions.ts`
- `docs/dashboard-insights.md`
- `docs/mvp-plan.md`

## 更新履歴
- 2025-10-18: チケット作成
