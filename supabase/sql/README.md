# Supabase SQL Playbooks

| File | 用途 |
| --- | --- |
| `000_reset_household_module.sql` | 既存の世帯/取引ドメインを完全に削除します（データ消失に注意）。 |
| `001_create_household_module.sql` | テーブル・関数・RLS ポリシーを一括作成します。`000` 実行後に流してください。 |
| `002_update_household_owner_policy.sql` | owner_user_id の自動上書きと households INSERT ポリシー調整。`001` 適用済み環境向け。 |

実行手順（Supabase SQL Editor）:
1. ローカルで内容を確認し、必要に応じて編集。
2. `000_reset_household_module.sql` を実行して既存オブジェクトを削除。
3. `001_create_household_module.sql` を実行して新しいスキーマを構築。
4. 既に `001` を流した環境にポリシー調整が必要な場合は `002_update_household_owner_policy.sql` を追加で実行。
5. ローカルでは `supabase db remote commit` / `supabase db push --dry-run` などで差分確認。

アーカイブ済みの旧スクリプトは `archive/` ディレクトリに保管しています。長期的に不要であれば削除してください。
