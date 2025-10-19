# PB-63-65: Supabase RLS 強化

## 概要
世帯・取引関連テーブルへ行レベルセキュリティ（RLS）を導入し、認証済みユーザーのみが自身の世帯データへアクセスできるようにする。JOINコード消費や残高計算 RPC の権限も見直し、リリース前に安全な状態へ移行する。

## 関連バックログ
- PB-63: RLS ポリシーと権限マトリクスの設計
- PB-64: Supabase マイグレーションの実装とロールアウト
- PB-65: フロントエンド調整と回帰テスト

## タスク

### 1. RLS 設計とレビュー (PB-63)
- [ ] household / join code / transaction / settlement / profile のアクセス制御マトリクスを整理
- [ ] household オーナー・メンバー・未所属ユーザーの操作可否をドキュメント化
- [ ] `get_household_balances` など SECURITY DEFINER 関数の呼び出しガード方針を決定
- [ ] レビュワーと合意し設計を確定

### 2. Supabase SQL マイグレーション作成 (PB-64)
- [ ] `supabase/sql/005_enable_rls_policies.sql` を追加（RLS 有効化、ヘルパー関数、ポリシー作成、ロールバック手順コメントを含む）
- [ ] 既存 `supabase-schema.sql` を最新状態へ更新し、再実行しても冪等となることを確認
- [ ] Supabase SQL エディターで `BEGIN` 〜 `COMMIT` ブロックを用いた検証を実施し、警告をレビュー
- [ ] `supabase db push --config supabase/config.toml --dry-run` を実行し、GitHub Actions のダイジェストを添付

### 3. クライアント更新と検証 (PB-65)
- [ ] JOIN コード消費フローが新しい UPDATE ポリシーを満たすか再確認し、必要なら service ロール or RPC 化
- [ ] RLS 有効化後のトランザクション／精算 API の挙動を E2E もしくは Vitest で回帰検証
- [ ] ダッシュボードで household 未所属ユーザーに 403 が返ること、および誘導 UI が崩れていないことを確認
- [ ] セキュリティ方針を `docs/mvp-setup-guide.md` に追記

## 受け入れ条件
- 認証済みユーザーが自身の所属世帯データにのみアクセスできる
- 世帯オーナーのみが JOIN コードの発行・無効化を行える
- JOIN コード使用時、利用ユーザー自身が `used_by` を更新できるが他世帯のコードを変更できない
- `get_household_balances` RPC は世帯メンバー以外にエラーを返す
- Lint / Build / Test / `supabase db push --dry-run` が全て成功するログを提示

## リスク・懸念
- SECURITY DEFINER 関数のチェック漏れによるデータ漏洩
- 既存クライアントコードが RLS による 401/403 を適切に処理できない可能性
- ポリシー誤設定による household オーナーの初回 SELECT 失敗

## 現行スキーマ スナップショット（ロールバック用参考）
```sql
create table public.household_join_codes (
  id uuid not null default gen_random_uuid (),
  household_id uuid not null,
  code text not null,
  status text not null default 'active'::text,
  expires_at timestamp with time zone not null,
  created_by uuid not null,
  used_by uuid null,
  used_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  constraint household_join_codes_pkey primary key (id),
  constraint household_join_codes_code_key unique (code),
  constraint household_join_codes_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint household_join_codes_household_id_fkey foreign KEY (household_id) references households (id) on delete CASCADE,
  constraint household_join_codes_used_by_fkey foreign KEY (used_by) references auth.users (id),
  constraint household_join_codes_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'used'::text,
          'expired'::text,
          'revoked'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_join_codes_household on public.household_join_codes using btree (household_id) TABLESPACE pg_default;
create index IF not exists idx_join_codes_status on public.household_join_codes using btree (status, expires_at) TABLESPACE pg_default;

create table public.household_members (
  id uuid not null default gen_random_uuid (),
  household_id uuid not null,
  user_id uuid not null,
  role text not null,
  joined_at timestamp with time zone null default now(),
  constraint household_members_pkey primary key (id),
  constraint household_members_household_id_user_id_key unique (household_id, user_id),
  constraint household_members_household_id_fkey foreign KEY (household_id) references households (id) on delete CASCADE,
  constraint household_members_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint household_members_role_check check (
    (role = any (array['owner'::text, 'member'::text]))
  )
) TABLESPACE pg_default;

create index IF not exists idx_household_members_household on public.household_members using btree (household_id) TABLESPACE pg_default;
create index IF not exists idx_household_members_user on public.household_members using btree (user_id) TABLESPACE pg_default;

create table public.households (
  id uuid not null default gen_random_uuid (),
  name text not null,
  owner_user_id uuid not null default auth.uid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint households_pkey primary key (id),
  constraint households_owner_user_id_fkey foreign KEY (owner_user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger add_household_owner_trigger
after INSERT on households for EACH row
execute FUNCTION add_household_owner_as_member ();

create trigger set_household_owner_before_insert BEFORE INSERT on households for EACH row
execute FUNCTION set_household_owner_id ();

create table public.profiles (
  id uuid not null,
  email text not null,
  name text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.settlements (
  id uuid not null default gen_random_uuid (),
  household_id uuid not null,
  from_user_id uuid null,
  to_user_id uuid null,
  amount numeric(12, 2) not null,
  settled_on date not null default CURRENT_DATE,
  note text null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  constraint settlements_pkey primary key (id),
  constraint settlements_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint settlements_from_user_id_fkey foreign KEY (from_user_id) references auth.users (id) on delete CASCADE,
  constraint settlements_household_id_fkey foreign KEY (household_id) references households (id) on delete CASCADE,
  constraint settlements_to_user_id_fkey foreign KEY (to_user_id) references auth.users (id) on delete CASCADE,
  constraint settlements_amount_check check ((amount > (0)::numeric)),
  constraint settlements_participants_check check (
    (
      (from_user_id is not null)
      or (to_user_id is not null)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_settlements_household on public.settlements using btree (household_id, settled_on desc) TABLESPACE pg_default;
create index IF not exists idx_settlements_participants on public.settlements using btree (from_user_id, to_user_id) TABLESPACE pg_default;

create table public.transactions (
  id uuid not null default gen_random_uuid (),
  household_id uuid not null,
  type public.transaction_type not null,
  amount numeric(12, 2) not null,
  occurred_on date not null default CURRENT_DATE,
  category text null,
  note text null,
  payer_user_id uuid null,
  advance_to_user_id uuid null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint transactions_pkey primary key (id),
  constraint transactions_advance_to_user_id_fkey foreign KEY (advance_to_user_id) references auth.users (id),
  constraint transactions_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint transactions_household_id_fkey foreign KEY (household_id) references households (id) on delete CASCADE,
  constraint transactions_payer_user_id_fkey foreign KEY (payer_user_id) references auth.users (id),
  constraint transactions_amount_check check ((amount > (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_transactions_household on public.transactions using btree (household_id, occurred_on desc) TABLESPACE pg_default;
create index IF not exists idx_transactions_created_by on public.transactions using btree (created_by) TABLESPACE pg_default;
```
