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
- フィールド: `households`, `currentHousehold`, `members`, `isLoading`, `error`。
- アクション:
  - `loadHouseholds()` : `household_members` 経由で一覧を取得。
  - `createHousehold(name)` : `/rest/v1/households` に挿入。
  - `inviteMember(email)` : `household_invites` に挿入、メールアドレスで参照。
  - `acceptInvite(token)` : 招待を承認し、`household_members` に追加。
  - `setCurrentHousehold(id)` : 選択した世帯を更新。
- トリガー: `AuthProvider` 初期化時に `loadHouseholds()` を呼び出す。

### `useTransactionStore`
- フィールド: `transactions`, `isLoading`, `error`.
- アクション:
  - `fetchRecent(householdId, month)` : Supabase RPC / フィルタで当月分を取得。
  - `createTransaction(payload)` : insert。
  - `deleteTransaction(id)` : 作成者のみ削除。

### `useSettlementStore`
- フィールド: `settlements`, `isLoading`, `error`, `balances`.
- アクション:
  - `fetchBalances(householdId)` : 取引と精算を集計して計算。
  - `recordSettlement(payload)` : insert 後に balances を再計算。

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
- `components/modals/InviteMemberModal.tsx`
- `components/modals/TransactionModal.tsx` : タブで支出 / 収入 / 立替を切り替え。
- `components/modals/SettlementModal.tsx`

モーダルは `@headlessui/react` または `shadcn/ui` の Dialog を利用。

## 4. API ラッパー

`src/services` ディレクトリを整理し、Supabase との通信を関数化する。
- `services/households.ts` : create, list, invites。
- `services/transactions.ts` : list, create, delete。
- `services/settlements.ts` : list, create。
- `services/users.ts` : プロフィール取得など。

Zustand ストアはこれらのサービス層を呼び出し、副作用とエラーハンドリングを統一する。

## 5. 認証ハンドリングフロー

1. `RootLayout` で `AuthProvider` をラップ。
2. `AuthProvider` は初期化時に `supabase.auth.getSession()` を呼び出し、`useAuthStore` を更新。
3. セッションが無い場合 `/auth` にリダイレクト。ある場合は `useHouseholdStore.loadHouseholds()` を実行。
4. `useHouseholdStore` で世帯が存在しない場合、ホーム画面でセットアップカードを表示。

## 6. 画面ステート遷移

```
未ログイン → /auth → ログイン成功 → /
  ├─ 世帯なし → SetupCard → 「世帯を作成」モーダル → 作成完了 → Dashboard
  └─ 世帯あり → Dashboard 表示
       ├─ FAB 「支出」→ TransactionModal(type=expense)
       ├─ FAB 「収入」→ TransactionModal(type=income)
       ├─ FAB 「精算」→ SettlementModal
       └─ 「メンバー招待」ボタン → InviteMemberModal
```

## 7. TODO / 未決事項

- Invite 承認フロー: メールで送られるリンクのルーティングは後続で検討。
- 立替残高の算出方法: Supabase RPC で集計するか、クライアント計算かを決定する。
- モバイル最適化: FAB / モーダルの UI 微調整。

この構成をベースに、まずは Auth → Household 作成 → 取引登録 → ダッシュボード表示 までを実装し、徐々に機能拡張していく。
