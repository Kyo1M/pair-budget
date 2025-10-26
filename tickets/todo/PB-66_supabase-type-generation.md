# PB-66: Supabase型定義の自動生成とas any削除

## ステータス
- **優先度**: Medium
- **カテゴリ**: 技術的改善
- **作成日**: 2025-10-21
- **関連チケット**: なし

## 背景
現在、Vercelデプロイエラーを解消するため、`services/settlements.ts`と`services/transactions.ts`で`as any`による型アサーションを使用しています。これは`@supabase/ssr`の型定義の問題を回避するための一時的な対処ですが、以下の問題があります：

- 型チェックの欠如によりコンパイル時のバグ検出ができない
- エディタのIntelliSense（自動補完）が効かない
- リファクタリング時の影響範囲が追跡できない

## 目的
Supabase CLIを使用して正確な型定義を自動生成し、型安全性を確保する。

## タスク

### 1. Supabase CLIのセットアップ
- [ ] Supabase CLIがインストールされているか確認
- [ ] `supabase login`でSupabaseプロジェクトに接続
- [ ] `supabase/config.toml`の設定確認

**修正ファイル**:
- `package.json` (devDependencies)

### 2. 型定義自動生成スクリプトの追加
- [ ] `supabase gen types typescript`コマンドをテスト実行
- [ ] 生成された型定義を確認
- [ ] `package.json`にスクリプトを追加（例: `"types:generate": "supabase gen types typescript --project-id <PROJECT_ID> > src/types/supabase.gen.ts"`）
- [ ] `.gitignore`に生成ファイルを追加するか、またはコミットするか決定

**修正ファイル**:
- `apps/web/package.json`
- `apps/web/.gitignore` (必要に応じて)

### 3. 型定義ファイルの置き換え
- [ ] 手動で作成した`src/types/supabase.ts`と自動生成された型定義を比較
- [ ] 自動生成された型定義を使用するようにインポートを変更
- [ ] 古い手動型定義ファイルを削除またはバックアップ

**修正ファイル**:
- `apps/web/src/types/supabase.ts` (削除または名前変更)
- `apps/web/src/types/supabase.gen.ts` (新規作成)

### 4. as anyの削除
- [ ] `src/services/settlements.ts`の2箇所の`as any`を削除
- [ ] `src/services/transactions.ts`の1箇所の`as any`を削除
- [ ] `src/lib/supabase/client.ts`の型アサーションを確認・調整
- [ ] `src/lib/supabase/server.ts`の型アサーションを確認・調整

**修正ファイル**:
- `apps/web/src/services/settlements.ts`
- `apps/web/src/services/transactions.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/server.ts`

### 5. テストとビルド確認
- [ ] `pnpm run build`でビルドが成功することを確認
- [ ] TypeScriptエラーが出ないことを確認
- [ ] ESLintエラーが出ないことを確認
- [ ] 既存機能が動作することを手動テスト

**修正ファイル**:
- なし（確認のみ）

### 6. ドキュメント更新
- [ ] `docs/mvp-setup-guide.md`に型定義生成手順を追加
- [ ] `CLAUDE.md`に型定義生成コマンドを追記
- [ ] READMEに開発フロー（DBスキーマ変更→型生成）を記載

**修正ファイル**:
- `docs/mvp-setup-guide.md`
- `CLAUDE.md`
- `apps/web/README.md`

### 7. CI/CD統合（オプション）
- [ ] GitHub Actionsで型定義が最新か確認するワークフローを追加
- [ ] PRチェックに型定義の整合性チェックを追加

**修正ファイル**:
- `.github/workflows/type-check.yml` (新規作成、オプション)

## 成功基準
- ✅ `as any`が完全に削除されている
- ✅ TypeScriptの型チェックが完全に機能している
- ✅ ビルドが成功する
- ✅ エディタのIntelliSenseが正常に動作する
- ✅ 型定義生成手順がドキュメント化されている

## 参考資料
- [Supabase CLI - Generating TypeScript Types](https://supabase.com/docs/reference/cli/supabase-gen-types-typescript)
- [Supabase - Type Support](https://supabase.com/docs/reference/javascript/typescript-support)

## 更新履歴
- 2025-10-21: チケット作成

