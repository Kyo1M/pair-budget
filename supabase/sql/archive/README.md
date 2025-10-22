# マイグレーションファイル アーカイブ

このディレクトリには、過去のマイグレーションファイルが保管されています。

## アーカイブされた理由

これらのマイグレーションファイルは以下の問題がありました：

1. **断片的な適用**: 001〜010まで順番に適用する必要があり、煩雑
2. **RLSポリシーの競合**: 005と006でhouseholdsのINSERTポリシーが競合
3. **トリガーの問題**: 世帯作成関連トリガーがRLSと相性が悪かった

## 現在の推奨方法

**新規セットアップ**: `supabase/sql/schema_clean.sql` を使用してください。

このファイル1つで全ての問題を修正した完全なスキーマが構築されます。

詳細は [SCHEMA_SETUP.md](../../../SCHEMA_SETUP.md) を参照してください。

## アーカイブファイル一覧

| ファイル | 内容 | 問題点 |
|---------|------|--------|
| 001_adjust_household_owner_defaults.sql | owner_user_id のデフォルト設定とトリガー追加 | RLSとトリガーの相性問題 |
| 002_update_household_insert_policy.sql | householdsのINSERTポリシー更新 | 005で上書きされる |
| 003_fix_household_member_profile_fk.sql | household_membersの外部キー修正 | profilesレコード不足問題は未解決 |
| 004_allow_household_settlements.sql | settlementsテーブルのRLSポリシー追加 | - |
| 005_enable_rls_policies.sql | 全テーブルのRLSポリシー設定 | householdsのINSERTポリシーが厳しすぎる |
| 006_fix_household_insert_policy.sql | householdsのINSERTポリシー修正 | 005との競合、順序依存 |
| 007_remove_household_triggers.sql | 世帯作成関連トリガー削除 | 001のトリガーを削除 |
| 008_create_profile_on_signup.sql | profiles自動作成トリガー追加 | - |
| 009_backfill_existing_profiles.sql | 既存ユーザーのprofilesバックフィル | - |
| 010_fix_household_creation_comprehensive.sql | 統合修正スクリプト | 断片的な修正の集大成 |
| debug_*.sql | デバッグ用クエリ | - |

## 履歴参照

これらのファイルは、問題解決の過程を記録した履歴として保持されています。
将来的に類似の問題が発生した際の参考資料として利用できます。

---

最終更新: 2025-10-22
