# Web App MVP アーキテクチャ指針

Supabase スキーマ刷新に合わせ、Next.js (App Router) 側のページ構成と状態管理を再設計する。

## 1. ルーティング構成

| URL | 用途 | 説明 |
|-----|------|------|
| `/` | ホーム / ダッシュボード | ログイン済みの場合のメイン画面。世帯未作成ならセットアップカードを表示。 |
| `/auth` | 認証 | サインアップ / ログイン。認証成功後は `/` に遷移。 |
| `/households` | オプション | 将来的な世帯一覧。MVP では `/` 内のモーダルで対応。 |

App Router の `layout.tsx` で `AuthProvider` を読み込み、子コンテンツに認証状態を配布する。

## 2. 状態管理 (Zustand)

### `useAuthStore`
- フィールド: `user`, `session`, `isLoading`, `error`。
- アクション: `signIn`, `signUp`, `signOut`, `refreshSession`。
- Supabase の `auth.onAuthStateChange` と連動し、ストア内で `checkSession()` を実装。

### `useHouseholdStore`
- フィールド: `household`, `members`, `joinCode`, `isLoading`, `error`。
- アクション:
  - `loadHousehold()` : `household_members` 経由で世帯を取得（MVP時点では1世帯のみ）。
  - `createHousehold(name)` : `/rest/v1/households` に挿入。
  - `generateJoinCode()` : `household_join_codes` に追加し、コードと期限を受け取る。
  - `consumeJoinCode(code)` : コードを検証し、`household_members` に追加。
- トリガー: `AuthProvider` 初期化時に `loadHousehold()` を呼び出す。
- **MVP制約**: 1ユーザーは1世帯のみに所属。

### `useTransactionStore`
- フィールド: `transactions`, `isLoading`, `error`.
- アクション:
  - `fetchRecent(householdId, month)` : Supabase RPC / フィルタで当月分を取得。
  - `createTransaction(payload)` : insert。
  - `deleteTransaction(id)` : 作成者のみ削除。

### `useSettlementStore`
- フィールド: `settlements`, `isLoading`, `error`, `balances`.
- アクション:
  - `fetchBalances(householdId)` : `get_household_balances(household_id)` RPC関数を呼び出して取得。
  - `recordSettlement(payload)` : insert 後に balances を再取得。

## 3. UI コンポーネント

### 共通レイアウト
- `components/layout/AppShell.tsx`
  - ヘッダー: 世帯名とユーザーアイコン。
  - メイン: スクロール可能なコンテンツ。
  - FAB: `components/ui/Fab.tsx` を設置。

### ホーム画面
- `components/dashboard/HouseholdSetupCard.tsx` : 世帯未作成時。
- `components/dashboard/SummaryCards.tsx` : 収入 / 支出 / 差額。
- `components/dashboard/RecentTransactions.tsx`。
- `components/dashboard/BalanceCard.tsx` : 立替残高。

### モーダル / フォーム
- `components/modals/CreateHouseholdModal.tsx`
- `components/modals/ShareJoinCodeModal.tsx`
- `components/modals/JoinHouseholdModal.tsx`
- `components/modals/TransactionModal.tsx` : タブで支出 / 収入 / 立替を切り替え。
- `components/modals/SettlementModal.tsx`

モーダルは shadcn/ui の Dialog を基本とし、必要に応じてカスタムフックで状態を管理。

## 4. API ラッパー

`src/services` ディレクトリを整理し、Supabase との通信を関数化する。
- `services/households.ts` : create, list, join code generation。
- `services/transactions.ts` : list, create, delete。
- `services/settlements.ts` : list, create。
- `services/users.ts` : プロフィール取得など。
- `services/joinCodes.ts` : create, verify, invalidate join codes。

Zustand ストアはこれらのサービス層を呼び出し、副作用とエラーハンドリングを統一する。

## 5. 認証ハンドリングフロー

1. `RootLayout` で `AuthProvider` をラップ。
2. `AuthProvider` は初期化時に `supabase.auth.getSession()` を呼び出し、`useAuthStore` を更新。
3. セッションが無い場合 `/auth` にリダイレクト。ある場合は `useHouseholdStore.loadHousehold()` を実行。
4. `useHouseholdStore` で世帯が存在しない場合、ホーム画面でセットアップカードを表示。
5. **MVP制約**: 既に世帯に所属している場合、新規世帯作成・参加はできない（1ユーザー1世帯）。

## 6. 画面ステート遷移

```
未ログイン → /auth → ログイン成功 → /
  ├─ 世帯なし → SetupCard → 「世帯を作成」モーダル → 作成完了 → Dashboard
  └─ 世帯あり → Dashboard 表示
       ├─ FAB 「支出」→ TransactionModal(type=expense)
       ├─ FAB 「収入」→ TransactionModal(type=income)
       ├─ FAB 「精算」→ SettlementModal
       └─ 「参加コードを共有」ボタン → ShareJoinCodeModal
             └→ 相手がログイン後 JoinHouseholdModal でコード入力
```

## 7. 立替の仕様詳細

`TransactionModal` で立替を選択した場合:
- **立替先の選択**: 
  - 「家庭全体」を選択 → `advance_to_user_id` = NULL
    - 本来世帯の共同支出として出すべきものを立て替えた状態
    - 立て替えた金額をそのまま返してもらう
    - 例: PC 20万円、家賃、光熱費など
  - 「相手（パートナー名）」を選択 → `advance_to_user_id` = 相手のユーザーID
    - 相手の個人的な支出を立て替えた状態
    - 立て替えた金額をそのまま返してもらう
    - 例: 相手の個人的な買い物を代わりに支払った
- 2つのパターンの違いは記録・分類の目的であり、どちらも立て替えた金額をそのまま精算で返してもらう。
- 立替残高カードでは、誰に対していくらの残高があるかを表示する。

## 8. TODO / 未決事項

- モバイル最適化: FAB / モーダルの UI 微調整。
- 立替の「家庭全体」パターンの精算フロー詳細設計（将来的に3人以上の世帯を想定する場合）。

この構成をベースに、まずは Auth → Household 作成 → 取引登録 → ダッシュボード表示 までを実装し、徐々に機能拡張していく。
