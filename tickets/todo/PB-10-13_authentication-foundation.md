# PB-10-13: 認証基盤の構築

## 概要
Supabase クライアント、AuthProvider、Zustand ストア、認証画面の実装を行う。

## 関連バックログ
- PB-11: Supabase クライアント初期化ユーティリティの実装
- PB-12: AuthProvider と useAuthStore (Zustand) の実装
- PB-13: /auth ルートの UI 実装

## タスク

### 1. Supabase クライアントの実装 (PB-11)
- [ ] `apps/web/src/lib/supabase/client.ts` を作成
  - クライアントサイド用の Supabase クライアントを実装
  - createClientComponentClient を使用
- [ ] `apps/web/src/lib/supabase/server.ts` を作成
  - サーバーサイド用の Supabase クライアントを実装
  - createServerComponentClient を使用
- [ ] 型定義ファイル `apps/web/src/types/supabase.ts` を作成
  - Supabase Database 型を定義

### 2. Auth Store の実装 (PB-12)
- [ ] `apps/web/src/store/useAuthStore.ts` を作成
  - フィールド: `user`, `session`, `isLoading`, `error`
  - アクション: `signIn`, `signUp`, `signOut`, `checkSession`
- [ ] セッション管理ロジックを実装
  - `auth.onAuthStateChange` リスナーの設定
  - セッション更新処理

### 3. AuthProvider の実装 (PB-12)
- [ ] `apps/web/src/components/providers/AuthProvider.tsx` を作成
  - useAuthStore と連携
  - セッションの初期化処理
  - 認証状態のリアルタイム監視
- [ ] `apps/web/src/app/layout.tsx` に AuthProvider を追加
  - RootLayout でラップ

### 4. 認証ページの実装 (PB-13)
- [ ] `apps/web/src/app/auth/page.tsx` を作成
  - サインアップ/ログインフォームを実装
  - タブまたはトグルで切り替え
- [ ] `apps/web/src/components/auth/SignInForm.tsx` を作成
  - メールアドレスとパスワード入力
  - react-hook-form + zod でバリデーション
  - エラー表示
- [ ] `apps/web/src/components/auth/SignUpForm.tsx` を作成
  - メールアドレス、パスワード、名前の入力
  - パスワード確認フィールド
  - react-hook-form + zod でバリデーション

### 5. バリデーションスキーマの作成 (PB-13)
- [ ] `apps/web/src/lib/validations/auth.ts` を作成
  - signInSchema: メールとパスワード
  - signUpSchema: メール、パスワード、パスワード確認、名前

### 6. リダイレクト処理の実装
- [ ] Middleware の作成 `apps/web/src/middleware.ts`
  - 未認証時は `/auth` にリダイレクト
  - 認証済みで `/auth` にアクセスした場合は `/` にリダイレクト
- [ ] 認証成功後のリダイレクト処理を実装

### 7. エラーハンドリング
- [ ] エラーメッセージの日本語化
- [ ] エラー表示コンポーネント `apps/web/src/components/ui/error-message.tsx` を作成
- [ ] Supabase エラーの適切なハンドリング

### 8. テスト・動作確認
- [ ] サインアップが正常に動作することを確認
  - ユーザー作成
  - profiles テーブルへの自動挿入（trigger）
- [ ] ログインが正常に動作することを確認
- [ ] ログアウトが正常に動作することを確認
- [ ] セッション永続化が動作することを確認
  - ページリロード後もログイン状態が保持される

## 関連ファイル
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/types/supabase.ts`
- `apps/web/src/store/useAuthStore.ts`
- `apps/web/src/components/providers/AuthProvider.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/auth/page.tsx`
- `apps/web/src/components/auth/SignInForm.tsx`
- `apps/web/src/components/auth/SignUpForm.tsx`
- `apps/web/src/lib/validations/auth.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/components/ui/error-message.tsx`

## 更新履歴
- 2025-10-13: チケット作成

