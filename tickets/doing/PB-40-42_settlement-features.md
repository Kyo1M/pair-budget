# PB-40-42: 精算機能の実装

## 概要
立替の精算機能を実装し、立替残高の更新を行う。

## 関連バックログ
- PB-40: useSettlementStore と services/settlements.ts の拡張
- PB-41: 精算モーダルと UI の実装
- PB-42: E2E テストの整備（将来対応）

## タスク

### 1. Settlement Service の拡張 (PB-40)
- [ ] `apps/web/src/services/settlements.ts` を更新
  - `getSettlements(householdId: string)`: 精算履歴取得
  - `createSettlement(data: SettlementData)`: 精算記録作成
  - `deleteSettlement(id: string)`: 精算削除（作成者のみ）
- [ ] 精算型定義 `apps/web/src/types/settlement.ts` を作成
  - SettlementData インターフェース

### 2. Settlement Store の拡張 (PB-40)
- [ ] `apps/web/src/store/useSettlementStore.ts` を更新
  - フィールドに `settlements` を追加
  - アクション:
    - `loadSettlements(householdId: string)`: 精算履歴取得
    - `addSettlement(data: SettlementData)`: 精算追加
      - settlements テーブルに挿入
      - 完了後に balances を再取得
    - `removeSettlement(id: string)`: 精算削除

### 3. 精算モーダルの実装 (PB-41)
- [ ] `apps/web/src/components/modals/SettlementModal.tsx` を作成
  - 精算方向の選択
    - 「相手に支払う」
    - 「相手から受け取る」
  - 入力フィールド:
    - 金額（必須、数値）
    - 日付（必須、デフォルト: 今日）
    - メモ（任意）
  - 現在の立替残高を表示
    - プラスの場合: 「相手に返してもらう金額」
    - マイナスの場合: 「相手に返す金額」
  - shadcn/ui の Dialog を使用

### 4. バリデーションスキーマの作成 (PB-41)
- [ ] `apps/web/src/lib/validations/settlement.ts` を作成
  - settlementSchema:
    - 金額: 正の数値、必須
    - 日付: 有効な日付形式、必須
    - メモ: 任意、最大200文字

### 5. FAB への精算ボタン追加
- [ ] `apps/web/src/components/ui/Fab.tsx` を更新
  - 「精算を記録」メニュー項目を追加
  - クリックで SettlementModal を開く

### 6. 精算履歴の表示 (将来拡張用の準備)
- [ ] `apps/web/src/components/dashboard/SettlementHistory.tsx` を作成
  - 精算履歴の一覧表示
  - 各精算の表示項目:
    - 日付
    - 支払者 → 受取者
    - 金額
    - メモ
  - MVP では非表示だが、コンポーネントは準備しておく

### 7. 残高更新ロジックの確認
- [ ] 精算後の残高再計算が正しく動作することを確認
  - get_household_balances RPC 関数を再呼び出し
  - 画面に即座に反映されることを確認

### 8. UI/UX の改善
- [ ] ローディング状態の表示
- [ ] エラーハンドリング
- [ ] トースト通知（精算記録成功）
- [ ] 精算後の残高変化をアニメーションで表示

### 9. テスト・動作確認
- [ ] 精算の記録が正常に動作することを確認
  - settlements テーブルに挿入
  - from_user_id と to_user_id が正しく設定される
- [ ] 精算後の立替残高が正しく更新されることを確認
  - 支払った場合: 残高が減る
  - 受け取った場合: 残高が増える
- [ ] RLS ポリシーが正しく機能することを確認
- [ ] エッジケースのテスト
  - 残高が0の状態で精算を記録
  - 大きな金額の精算

### 10. E2E テストの準備 (PB-42 - 将来対応)
- [ ] Playwright のセットアップ（将来）
- [ ] テストシナリオの定義
  1. 世帯作成
  2. 参加コード発行・使用
  3. 立替の記録
  4. 立替残高の確認
  5. 精算の記録
  6. 残高更新の確認

## 関連ファイル
- `apps/web/src/services/settlements.ts`
- `apps/web/src/types/settlement.ts`
- `apps/web/src/store/useSettlementStore.ts`
- `apps/web/src/components/modals/SettlementModal.tsx`
- `apps/web/src/components/dashboard/SettlementHistory.tsx`
- `apps/web/src/lib/validations/settlement.ts`
- `apps/web/src/components/ui/Fab.tsx`

## 更新履歴
- 2025-10-13: チケット作成

