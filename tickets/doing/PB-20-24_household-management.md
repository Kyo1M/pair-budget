# PB-20-24: 世帯管理機能の実装

## 概要
世帯の作成、参加コードの発行・使用、世帯メンバー管理機能を実装する。

## 関連バックログ
- PB-20: useHouseholdStore と Supabase service の実装
- PB-21: 未世帯時の HouseholdSetupCard の作成
- PB-22: 世帯作成モーダルと API 呼び出しの実装
- PB-23: メンバー招待モーダルの実装
- PB-24: 参加コード入力フローの実装

## タスク

### 1. Household Service の実装 (PB-20)
- [x] `apps/web/src/services/households.ts` を作成
  - `createHousehold(name: string)`: 世帯作成
  - `getHousehold(userId: string)`: ユーザーの世帯取得（MVP: 1世帯のみ）
  - `getHouseholdMembers(householdId: string)`: メンバー一覧取得
- [x] エラーハンドリングと型定義を実装
- [x] JSDoc コメントを追加

### 2. Join Code Service の実装 (PB-20)
- [x] `apps/web/src/services/joinCodes.ts` を作成
  - `generateJoinCode(householdId: string)`: 参加コード発行
    - 6桁の英数字（紛らわしい文字を除外: O/0, I/1/l など）
    - 有効期限: 24時間
  - `validateJoinCode(code: string)`: コード検証
  - `consumeJoinCode(code: string, userId: string)`: コード使用
    - household_members に追加
    - コードを used ステータスに更新
- [x] コード生成ロジックを実装
  - 除外文字: O, 0, I, 1, l
  - 使用可能文字: ABCDEFGHJKMNPQRSTUVWXYZ23456789

### 3. Household Store の実装 (PB-20)
- [x] `apps/web/src/store/useHouseholdStore.ts` を作成
  - フィールド: `household`, `members`, `joinCode`, `isLoading`, `error`
  - アクション:
    - `loadHousehold()`: 世帯情報の取得
    - `createHousehold(name: string)`: 世帯作成
    - `generateJoinCode()`: 参加コード発行
    - `joinHousehold(code: string)`: 参加コード使用
    - `refreshMembers()`: メンバー一覧の再取得

### 4. ホーム画面のベース実装 (PB-21)
- [x] `apps/web/src/app/page.tsx` を更新
  - useHouseholdStore で世帯状態を取得
  - 世帯なし → HouseholdSetupCard を表示
  - 世帯あり → Dashboard を表示（次チケットで詳細実装）
- [x] `apps/web/src/components/household/HouseholdSetupCard.tsx` を作成
  - 「世帯を作成」ボタン
  - 「参加コードで参加」ボタン
  - モーダルのトリガー

### 5. 世帯作成モーダルの実装 (PB-22)
- [x] `apps/web/src/components/modals/CreateHouseholdModal.tsx` を作成
  - 世帯名入力フィールド
  - 作成ボタン
  - shadcn/ui の Dialog を使用
- [ ] `apps/web/src/lib/validations/household.ts` を作成
  - createHouseholdSchema: 世帯名（必須、1〜50文字）
- [ ] 作成成功後の処理
  - モーダルを閉じる
  - 世帯情報を再取得
  - トースト通知を表示（成功メッセージ）

### 6. 参加コード発行モーダルの実装 (PB-23)
- [x] `apps/web/src/components/modals/ShareJoinCodeModal.tsx` を作成
  - 参加コード生成ボタン
  - 生成されたコードの表示
  - コピーボタン（クリップボードにコピー）
  - 有効期限の表示
  - shadcn/ui の Dialog を使用
- [x] コピー機能の実装
  - Clipboard API を使用
  - コピー成功時のフィードバック

### 7. 参加コード入力モーダルの実装 (PB-24)
- [x] `apps/web/src/components/modals/JoinHouseholdModal.tsx` を作成
  - 6桁のコード入力フィールド
  - 自動フォーマット（大文字変換）
  - 参加ボタン
  - shadcn/ui の Dialog を使用
- [x] `apps/web/src/lib/validations/household.ts` でバリデーション
  - joinHouseholdSchema: コード（6文字、英数字のみ）
- [ ] 参加成功後の処理
  - モーダルを閉じる
  - 世帯情報を再取得
  - ホーム画面（ダッシュボード）に遷移

### 8. エラーハンドリング
- [x] コード不正・期限切れのエラー表示
- [x] すでに世帯に所属している場合のエラー（MVP制約）
- [x] ネットワークエラーのハンドリング

### 9. UI/UX の改善
- [x] ローディング状態の表示
- [x] トースト通知の実装（成功・エラー）
  - sonner を使用
- [x] モーダルのアニメーション（shadcn/ui デフォルト）

### 10. テスト・動作確認
- [ ] 世帯作成が正常に動作することを確認（次のステップで実施）
  - households テーブルに挿入
  - household_members に owner として追加（trigger）
- [ ] 参加コード発行が正常に動作することを確認（次のステップで実施）
  - household_join_codes テーブルに挿入
  - 有効期限が24時間後に設定される
- [ ] 参加コード使用が正常に動作することを確認（次のステップで実施）
  - household_members に member として追加
  - コードが used ステータスに更新
- [ ] RLS ポリシーが正しく機能することを確認（次のステップで実施）
  - オーナーのみがコード発行できる
  - 認証済みユーザーが有効なコードを使用できる

## 関連ファイル
- `apps/web/src/services/households.ts`
- `apps/web/src/services/joinCodes.ts`
- `apps/web/src/store/useHouseholdStore.ts`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/household/HouseholdSetupCard.tsx`
- `apps/web/src/components/modals/CreateHouseholdModal.tsx`
- `apps/web/src/components/modals/ShareJoinCodeModal.tsx`
- `apps/web/src/components/modals/JoinHouseholdModal.tsx`
- `apps/web/src/lib/validations/household.ts`

## 更新履歴
- 2025-10-13: チケット作成
- 2025-10-13: Household/JoinCodeサービス、ストア、バリデーションの実装完了
  - household.ts型定義
  - households.ts サービス（世帯作成、取得、メンバー取得）
  - joinCodes.ts サービス（コード発行、検証、使用）
  - useHouseholdStore（Zustand）
  - household.ts バリデーションスキーマ
  - Supabase型定義の制限により一部any型を使用（eslint-disable）
- 2025-10-13: 世帯管理UIコンポーネントの実装完了
  - HouseholdSetupCard（世帯作成・参加の導線）
  - CreateHouseholdModal（世帯作成フォーム）
  - ShareJoinCodeModal（参加コード発行・共有）
  - JoinHouseholdModal（参加コード入力）
  - ホームページ更新（世帯状態に応じた表示切り替え）
  - 実装完了、次は動作確認

