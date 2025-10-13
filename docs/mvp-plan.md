# PairBudget MVP 要件整理

既存フローを一旦リセットし、Supabase と Next.js を使った最小機能に絞った MVP を定義する。対象は夫婦など 2 人世帯の共同家計管理。

## 1. ユーザーフロー

1. **サインアップ / ログイン**
   - Supabase Auth (メール + パスワード)。
   - ログイン後はホーム画面へ遷移。
2. **世帯の作成または参加**
   - ホームに「世帯を作成」「世帯に招待コードで参加」の導線。
   - MVP ではメールアドレス入力による招待のみ実装。招待されたユーザーはメール内の情報を元にログインし、自動でメンバー化される。
3. **取引の記録**
   - ホーム画面右下の FAB からモーダルを開き、支出・収入・立替のいずれかを入力。
   - 入力必須: 金額、日付 (デフォルト今日)、カテゴリ、メモ (任意)。
   - 支出の場合は支払者と負担割合 (当面は 50/50 固定)。
4. **ダッシュボード**
   - 月次サマリー (収入 / 支出 / 差額)。
   - 最近の取引 (最新 5 件)。
   - 立替残高 (相手に対していくらプラス / マイナスか)。
5. **立替精算**
   - 「精算を記録」で相手に支払った金額を記録し、立替残高を減算。

## 2. 機能一覧

| 機能 | 説明 | 画面 |
|------|------|------|
| 認証 | Supabase Auth によるメール / パスワード認証 | `/auth` |
| ホーム | 未世帯なら作成・参加導線、既世帯ならダッシュボードと FAB | `/` |
| 世帯作成 | household 名称入力のみ (オーナー = 作成ユーザー) | モーダル |
| メンバー招待 | メールアドレスを入力して household_members に追加 | モーダル |
| 取引登録 | 支出 / 収入 / 立替 (種別切替) | モーダル |
| 取引一覧 | 最近の取引、カテゴリ・金額の表示 | ホーム |
| 立替残高 | household_members テーブルに保持するバランス集計 | ホーム |
| 精算 | 支払い金額を記録し、残高を調整 | モーダル |

## 3. Supabase データモデル (概要)

| テーブル | 用途 | 主な列 |
|----------|------|--------|
| `profiles` | Supabase auth.users の拡張 | `id` (UUID), `email`, `name`, `created_at` |
| `households` | 世帯本体 | `id`, `name`, `owner_user_id`, `created_at` |
| `household_members` | 世帯とユーザーの紐付け | `id`, `household_id`, `user_id`, `role`, `balance_amount` |
| `transactions` | 収支・立替 | `id`, `household_id`, `type`, `amount`, `category`, `occurred_on`, `payer_user_id`, `note` |
| `settlements` | 立替精算 | `id`, `household_id`, `from_user_id`, `to_user_id`, `amount`, `settled_on`, `note` |
| `invites` (任意) | 将来の拡張用に招待状態を保持 | `id`, `household_id`, `email`, `status`, `token` |

RLS は `is_household_member(household_id)` / `is_household_owner(household_id)` で判定する。

## 4. 画面 / UI 構成

- **レイアウト**
  - `RootLayout`: 署名済みセッションを監視し、ローディング or コンテンツを出し分け。
  - `ProtectedLayout`: household が未選択の場合はセットアップモーダルを表示。
- **ホーム (Dashboard)**
  - ヘッダー: 世帯名と月選択 (デフォルト当月)。
  - サマリーカード (収入 / 支出 / 差額)。
  - 最近の取引リスト。
  - 立替残高セクション。
  - 右下 FAB: 「支出」「収入」「精算」などのクイックアクション。
- **モーダル**
  - 世帯作成モーダル
  - 招待モーダル
  - 取引登録モーダル
  - 精算モーダル

## 5. 状態管理

- Auth 状態: Supabase セッションを保持 (`useAuthStore`)。
- Household 状態: 現在の世帯、メンバー、残高 (`useHouseholdStore`)。
- Dashboard データ: 月次サマリー、最近取引、立替 (`useDashboardStore`)。
- 取引フォーム: 一時的なローカル state。

## 6. 優先実装順

1. Supabase スキーマ定義 (SQL) と RLS ポリシー。
2. Next.js 認証ラッパーと未世帯時のセットアップ導線。
3. 世帯作成 / 招待 UI と API 呼び出し。
4. 取引登録 + ダッシュボードのサマリー表示。
5. 精算登録と立替残高の更新ロジック。
6. スタイル調整とエラーハンドリング。

## 7. 今後の拡張余地

- 招待リンク発行 (トークン式)。
- 複数世帯の切り替え。
- カテゴリのカスタマイズ。
- iOS アプリとの同期。
