# PB-30-33: 取引機能の実装

## 概要
取引（支出・収入・立替）の登録、一覧表示、ダッシュボードのサマリー表示を実装する。

## 関連バックログ
- PB-30: useTransactionStore と services/transactions.ts の構築
- PB-31: ダッシュボード UI コンポーネント群の実装
- PB-32: FAB と TransactionModal の実装
- PB-33: 立替残高の表示

## タスク

### 1. Transaction Service の実装 (PB-30)
- [x] `apps/web/src/services/transactions.ts` を作成
  - `getTransactions(householdId: string, month?: string)`: 取引一覧取得
  - `getRecentTransactions(householdId: string, limit: number)`: 最近の取引取得
  - `createTransaction(data: TransactionData)`: 取引作成
  - `deleteTransaction(id: string)`: 取引削除（作成者のみ）
- [x] 取引型定義 `apps/web/src/types/transaction.ts` を作成
  - TransactionType: 'expense' | 'income' | 'advance'
  - TransactionData インターフェース

### 2. Category 定義 (PB-30)
- [x] `apps/web/src/constants/categories.ts` を作成
  - カテゴリリスト: 食費、外食費、日用品、医療費、家具・家電、子ども、その他
  - カテゴリアイコン（Lucide React）の定義

### 3. Transaction Store の実装 (PB-30)
- [x] `apps/web/src/store/useTransactionStore.ts` を作成
  - フィールド: `transactions`, `recentTransactions`, `isLoading`, `error`
  - アクション:
    - `loadTransactions(householdId: string, month: string)`: 取引一覧取得
    - `loadRecentTransactions(householdId: string)`: 最近の取引取得
    - `addTransaction(data: TransactionData)`: 取引追加
    - `removeTransaction(id: string)`: 取引削除

### 4. Dashboard Store の実装 (PB-31)
- [x] `apps/web/src/store/useDashboardStore.ts` を作成
  - フィールド: `summary`, `selectedMonth`, `isLoading`
  - アクション:
    - `loadMonthlySummary(householdId: string, month: string)`: 月次サマリー取得
    - `setSelectedMonth(month: string)`: 月選択
  - サマリー計算ロジック
    - 収入合計
    - 支出合計
    - 差額

### 5. ダッシュボードレイアウトの実装 (PB-31)
- [x] `apps/web/src/app/page.tsx` を更新
  - ヘッダー: 世帯名、月選択、設定ボタン
  - サマリーカード
  - 最近の取引リスト
  - 立替残高カード
  - FAB（右下固定）
- [x] `apps/web/src/components/layout/DashboardHeader.tsx` を作成
  - 世帯名表示
  - 月選択（前月・次月ボタン）
  - ユーザーメニュー

### 6. サマリーカードの実装 (PB-31)
- [x] `apps/web/src/components/dashboard/SummaryCards.tsx` を作成
  - 収入カード
  - 支出カード
  - 差額カード
  - カラーコーディング（収入: 緑、支出: 赤、差額: 青）

### 7. 最近の取引リストの実装 (PB-31)
- [x] `apps/web/src/components/dashboard/RecentTransactions.tsx` を作成
  - 最新5件の取引を表示
  - 各取引の表示項目:
    - 日付
    - カテゴリアイコン
    - メモ
    - 金額
    - 取引タイプ
  - 「すべて表示」リンク（将来の拡張用）

### 8. FAB の実装 (PB-32)
- [x] `apps/web/src/components/ui/Fab.tsx` を作成
  - メインボタン（+アイコン）
  - クリックでメニュー展開
  - メニュー項目:
    - 支出を記録
    - 収入を記録
    - 立替を記録
    - 精算を記録
  - モバイルファーストのデザイン

### 9. 取引登録モーダルの実装 (PB-32)
- [x] `apps/web/src/components/modals/TransactionModal.tsx` を作成
  - タブで取引タイプを切り替え（支出・収入・立替）
  - 共通フィールド:
    - 金額（必須、数値）
    - 日付（必須、デフォルト: 今日）
    - カテゴリ（必須、ドロップダウン）
    - メモ（任意）
  - 支出の追加フィールド:
    - 支払者（ラジオボタン: 自分/相手）
  - 立替の追加フィールド:
    - 立替先（ラジオボタン: 家庭全体/相手の名前）
  - shadcn/ui の Dialog と Form を使用

### 10. バリデーションスキーマの作成 (PB-32)
- [x] `apps/web/src/lib/validations/transaction.ts` を作成
  - transactionSchema: タイプ別のバリデーション
  - 金額: 正の数値
  - 日付: 有効な日付形式
  - カテゴリ: カテゴリリストから選択

### 11. 立替残高カードの実装 (PB-33)
- [x] `apps/web/src/services/settlements.ts` を作成
  - `getHouseholdBalances(householdId: string)`: RPC関数呼び出し
- [x] `apps/web/src/store/useSettlementStore.ts` を作成
  - フィールド: `balances`, `isLoading`, `error`
  - アクション:
    - `loadBalances(householdId: string)`: 残高取得
- [x] `apps/web/src/components/dashboard/BalanceCard.tsx` を作成
  - 自分の立替残高を表示
  - プラス（相手に返してもらう額）
  - マイナス（相手に返す額）
  - カラーコーディング

### 12. UI/UX の改善
- [x] ローディング状態の表示
  - Skeleton コンポーネントの使用
- [x] エラーハンドリング
- [x] トースト通知（取引作成成功）
- [x] モーダルのアニメーション

### 13. テスト・動作確認
- [ ] 支出の登録が正常に動作することを確認
- [ ] 収入の登録が正常に動作することを確認
- [ ] 立替（家庭全体）の登録が正常に動作することを確認
- [ ] 立替（特定の相手）の登録が正常に動作することを確認
- [ ] 月次サマリーが正しく計算されることを確認
- [ ] 立替残高が正しく表示されることを確認
- [ ] RPC関数 get_household_balances が正しく動作することを確認

## 関連ファイル
- `apps/web/src/services/transactions.ts`
- `apps/web/src/services/settlements.ts`
- `apps/web/src/types/transaction.ts`
- `apps/web/src/constants/categories.ts`
- `apps/web/src/store/useTransactionStore.ts`
- `apps/web/src/store/useDashboardStore.ts`
- `apps/web/src/store/useSettlementStore.ts`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/layout/DashboardHeader.tsx`
- `apps/web/src/components/dashboard/SummaryCards.tsx`
- `apps/web/src/components/dashboard/RecentTransactions.tsx`
- `apps/web/src/components/dashboard/BalanceCard.tsx`
- `apps/web/src/components/ui/Fab.tsx`
- `apps/web/src/components/modals/TransactionModal.tsx`
- `apps/web/src/lib/validations/transaction.ts`

## 更新履歴
- 2025-10-13: チケット作成
