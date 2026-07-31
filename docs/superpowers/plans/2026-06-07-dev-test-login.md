# ローカル開発用テストログイン & seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ローカル開発時に dev 専用「テストログイン」ボタンと自動 seed スクリプトで、実データ付きの画面を最小手数で確認できるようにする（本番では完全無効）。

**Architecture:** ホスト型 Supabase に専用テスト世帯とテストユーザー2名（夫婦）を seed スクリプトで投入し、`/auth` に `NEXT_PUBLIC_ENABLE_DEV_LOGIN` ガード付きのクイックログインボタンを追加。ボタンは実在テストユーザーで `signInWithPassword` を実行するため RLS を満たし、middleware を正規通過する。middleware・本番認証フローは無改変。

**Tech Stack:** Next.js 15 (App Router) / TypeScript / Supabase (@supabase/supabase-js) / Zustand / Vitest + React Testing Library / tsx + dotenv（seed 実行用）

参照 spec: `docs/superpowers/specs/2026-06-07-dev-test-login-design.md`

## 確認済みの前提（実装時の事実）

- カテゴリは英語キー。支出: `groceries, dining, daily, medical, home, kids, transportation, fixed, other`。収入: `salary, sideline, windfall, subsidy`。
- `transactions` の DB カラム（snake_case）: `household_id, type('expense'|'income'|'advance'), amount(NUMERIC>0), occurred_on(date), category, note, payer_user_id, advance_to_user_id, place(nullable text), created_by`。
- `settlements` の DB カラム: `household_id, from_user_id, to_user_id, amount(>0), settled_on(date), note, created_by`。
- `household_members`: `household_id, user_id(→profiles.id), role('owner'|'member')`、`UNIQUE(household_id, user_id)`。
- `households`: `id, name, owner_user_id`。
- `on_auth_user_created` トリガーが auth ユーザー作成時に `profiles` を自動生成（`user_metadata.name` を採用）。**seed で profiles を直接 insert する必要なし。**
- service role クライアントは RLS をバイパスする。
- ログイン後遷移は既存 SignInForm 準拠: `router.push('/'); router.refresh();`。
- テスト基盤: Vitest（jsdom, globals:true）、`@testing-library/jest-dom/vitest` 登録済み、`@` エイリアス = `src/`。

## ファイル構成

- 新規 `apps/web/scripts/seed-test-data.ts` — service role でテストユーザー/世帯/取引/精算を冪等投入。
- 新規 `apps/web/src/components/auth/DevLoginButton.tsx` — dev 専用クイックログイン UI。
- 新規 `apps/web/src/components/auth/__tests__/DevLoginButton.test.tsx` — 上記の単体テスト。
- 新規 `apps/web/.env.example` — 全 env キーの placeholder。
- 変更 `apps/web/src/app/auth/page.tsx` — signin タブに DevLoginButton を差し込む。
- 変更 `apps/web/package.json` — `seed:test` script と `tsx`/`dotenv` devDependency。
- 変更 `CLAUDE.md` — ローカル開発手順（seed → dev-login）を追記。
- 変更（コミット対象外）`apps/web/.env.local` — dev-login 用キーを追加（手動）。

---

### Task 1: seed 実行ツール（tsx / dotenv）と npm script を追加

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: devDependency と script を追加**

`apps/web/package.json` の `"scripts"` に次の1行を追加（`test:coverage` の後など）:

```json
    "seed:test": "tsx scripts/seed-test-data.ts"
```

`"devDependencies"` に次の2つを追加（アルファベット順の位置でよい）:

```json
    "dotenv": "^16.4.7",
    "tsx": "^4.19.2",
```

- [ ] **Step 2: インストール**

Run: `pnpm install`
Expected: `dotenv` と `tsx` が追加され、`apps/web/node_modules/.bin/tsx` が存在する。

確認: `ls apps/web/node_modules/.bin/tsx` → パスが表示される。

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: seed 実行用に tsx/dotenv と seed:test script を追加"
```

---

### Task 2: `.env.example` を作成し env キーを定義

**Files:**
- Create: `apps/web/.env.example`

- [ ] **Step 1: `.env.example` を作成**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# サーバー専用（seed スクリプト等）。絶対に公開しない
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 開発用テストログイン（ローカルのみ true。Vercel など本番では未設定にすること）
NEXT_PUBLIC_ENABLE_DEV_LOGIN=false
NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL=test-taro@example.com
NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD=devpassword123
NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL=test-hanako@example.com
NEXT_PUBLIC_DEV_LOGIN_HANAKO_PASSWORD=devpassword123
```

- [ ] **Step 2: `.env.local`（手動・コミット対象外）に dev-login キーを追記**

既存の `apps/web/.env.local` に以下を追記する（`SUPABASE_SERVICE_ROLE_KEY` が無ければ Supabase ダッシュボードの値を設定）:

```bash
NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL=test-taro@example.com
NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD=devpassword123
NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL=test-hanako@example.com
NEXT_PUBLIC_DEV_LOGIN_HANAKO_PASSWORD=devpassword123
```

確認: `git status` に `apps/web/.env.local` が出ないこと（`.gitignore` 対象）。出る場合は無視する（add しない）。

- [ ] **Step 3: Commit（`.env.example` のみ）**

```bash
git add apps/web/.env.example
git commit -m "docs: .env.example を追加し dev-login 用キーを記載"
```

---

### Task 3: DevLoginButton コンポーネント（TDD）

**Files:**
- Test: `apps/web/src/components/auth/__tests__/DevLoginButton.test.tsx`
- Create: `apps/web/src/components/auth/DevLoginButton.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`apps/web/src/components/auth/__tests__/DevLoginButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevLoginButton } from '../DevLoginButton';

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signInMock = vi.fn();
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { signIn: typeof signInMock }) => unknown) =>
    selector({ signIn: signInMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('DevLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('フラグが未設定なら何も描画しない', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', '');
    const { container } = render(<DevLoginButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('フラグ on で2つのテストログインボタンを描画する', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    render(<DevLoginButton />);
    expect(
      screen.getByRole('button', { name: 'テスト太郎でログイン' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'テスト花子でログイン' })
    ).toBeInTheDocument();
  });

  it('ボタンクリックで正しい資格情報で signIn を呼び / に遷移する', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL', 'test-taro@example.com');
    vi.stubEnv('NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD', 'devpassword123');
    const user = userEvent.setup();
    render(<DevLoginButton />);

    await user.click(
      screen.getByRole('button', { name: 'テスト太郎でログイン' })
    );

    expect(signInMock).toHaveBeenCalledWith(
      'test-taro@example.com',
      'devpassword123'
    );
    expect(pushMock).toHaveBeenCalledWith('/');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('資格情報が未設定のボタンは signIn を呼ばずエラー通知する', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    // HANAKO の env を設定しないのでクリックしても signIn は呼ばれない
    const user = userEvent.setup();
    render(<DevLoginButton />);

    await user.click(
      screen.getByRole('button', { name: 'テスト花子でログイン' })
    );

    expect(signInMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter web test --run src/components/auth/__tests__/DevLoginButton.test.tsx`
Expected: FAIL（`DevLoginButton` モジュールが存在しない / import 解決エラー）。

- [ ] **Step 3: 最小実装を書く**

`apps/web/src/components/auth/DevLoginButton.tsx`:

```tsx
/**
 * 開発用テストログインボタン
 *
 * ローカル開発時のみ表示し、env に設定したテストアカウントで即ログインする。
 * `NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'` のときだけ描画され、
 * 本番（Vercel 等）では env 未設定のため何も描画されず資格情報もバンドルに残らない。
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

/** テストアカウント定義 */
interface DevAccount {
  /** ボタン表示名 */
  label: string;
  /** メールアドレス（env から取得・未設定なら undefined） */
  email?: string;
  /** パスワード（env から取得・未設定なら undefined） */
  password?: string;
}

/**
 * 開発用テストログインボタン群
 *
 * @returns dev-login が有効なときのみボタン群、そうでなければ null
 */
export function DevLoginButton() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== 'true') {
    return null;
  }

  const accounts: DevAccount[] = [
    {
      label: 'テスト太郎でログイン',
      email: process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL,
      password: process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD,
    },
    {
      label: 'テスト花子でログイン',
      email: process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL,
      password: process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_PASSWORD,
    },
  ];

  const handleLogin = async (account: DevAccount) => {
    if (!account.email || !account.password) {
      toast.error('テストアカウントの資格情報が未設定です（.env.local を確認）');
      return;
    }
    try {
      setLoadingLabel(account.label);
      await signIn(account.email, account.password);
      toast.success('テストログインしました');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'テストログインに失敗しました'
      );
    } finally {
      setLoadingLabel(null);
    }
  };

  return (
    <div className="mt-6 space-y-2 border-t pt-4">
      <p className="text-center text-xs text-muted-foreground">
        開発用テストログイン
      </p>
      {accounts.map((account) => (
        <Button
          key={account.label}
          type="button"
          variant="outline"
          className="w-full"
          disabled={loadingLabel !== null}
          onClick={() => handleLogin(account)}
        >
          {loadingLabel === account.label ? 'ログイン中...' : account.label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter web test --run src/components/auth/__tests__/DevLoginButton.test.tsx`
Expected: PASS（4 件）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/auth/DevLoginButton.tsx apps/web/src/components/auth/__tests__/DevLoginButton.test.tsx
git commit -m "feat: dev 専用テストログインボタンを追加"
```

---

### Task 4: `/auth` ページに DevLoginButton を差し込む

**Files:**
- Modify: `apps/web/src/app/auth/page.tsx`

- [ ] **Step 1: import を追加**

`apps/web/src/app/auth/page.tsx` の import 群（`SignUpForm` の import の下）に追加:

```tsx
import { DevLoginButton } from '@/components/auth/DevLoginButton';
```

- [ ] **Step 2: signin タブの SignInForm 直下に差し込む**

signin タブの `<CardContent>` 内、`<SignInForm />` の直後に追加:

```tsx
              <CardContent>
                <SignInForm />
                <DevLoginButton />
              </CardContent>
```

- [ ] **Step 3: dev で表示を目視確認**

Run: `pnpm --filter web dev`
ブラウザで `http://localhost:3000/auth` を開く。
Expected: サインインフォーム下に「開発用テストログイン」区切りと2ボタンが表示される（`.env.local` の `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` 前提）。確認後 dev サーバーを停止。

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/auth/page.tsx
git commit -m "feat: /auth にテストログインボタンを差し込み"
```

---

### Task 5: seed スクリプトを作成

**Files:**
- Create: `apps/web/scripts/seed-test-data.ts`

- [ ] **Step 1: スクリプトを作成**

`apps/web/scripts/seed-test-data.ts`:

```ts
/**
 * テストデータ seed スクリプト（ローカル開発用）
 *
 * service role でホスト型 Supabase に「テスト世帯」とテストユーザー2名（夫婦）、
 * 代表的な取引・精算を冪等に投入する。再実行するとテスト世帯の取引/精算を
 * 入れ替えて同じ状態に戻す。
 *
 * 実行: pnpm --filter web seed:test
 * 投入内容の確認のみ: pnpm --filter web seed:test -- --dry-run
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

/** テスト世帯の固定 UUID（冪等な特定に使用） */
const TEST_HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';

const TARO = {
  email: process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL ?? 'test-taro@example.com',
  password:
    process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD ?? 'devpassword123',
  name: 'テスト太郎',
};
const HANAKO = {
  email:
    process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL ?? 'test-hanako@example.com',
  password:
    process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_PASSWORD ?? 'devpassword123',
  name: 'テスト花子',
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください'
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** メールから既存ユーザーを探し、無ければ作成して id を返す */
async function ensureUser(account: {
  email: string;
  password: string;
  name: string;
}): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === account.email);
  if (existing) {
    console.log(`  user 既存: ${account.email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { name: account.name },
  });
  if (error) throw error;
  console.log(`  user 作成: ${account.email} (${data.user.id})`);
  return data.user.id;
}

/** 1日前/数日前などの日付文字列(YYYY-MM-DD)を返す */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(DRY_RUN ? '[dry-run] 投入内容のプレビュー' : 'seed 開始');

  // 1. ユーザー
  console.log('1. テストユーザー');
  if (DRY_RUN) {
    console.log(`  ${TARO.email} (owner), ${HANAKO.email} (member)`);
  }
  const taroId = DRY_RUN ? 'taro-id' : await ensureUser(TARO);
  const hanakoId = DRY_RUN ? 'hanako-id' : await ensureUser(HANAKO);

  // 2. テスト世帯（固定 UUID で find-or-create）
  console.log('2. テスト世帯');
  if (!DRY_RUN) {
    const { data: hh } = await admin
      .from('households')
      .select('id')
      .eq('id', TEST_HOUSEHOLD_ID)
      .maybeSingle();
    if (!hh) {
      const { error } = await admin.from('households').insert({
        id: TEST_HOUSEHOLD_ID,
        name: 'テスト世帯',
        owner_user_id: taroId,
      });
      if (error) throw error;
      console.log('  世帯 作成: テスト世帯');
    } else {
      console.log('  世帯 既存: テスト世帯');
    }

    // 3. メンバー
    const { error: memberError } = await admin
      .from('household_members')
      .upsert(
        [
          {
            household_id: TEST_HOUSEHOLD_ID,
            user_id: taroId,
            role: 'owner',
          },
          {
            household_id: TEST_HOUSEHOLD_ID,
            user_id: hanakoId,
            role: 'member',
          },
        ],
        { onConflict: 'household_id,user_id' }
      );
    if (memberError) throw memberError;
    console.log('3. メンバー upsert 完了');
  }

  // 4. 取引・精算（テスト世帯ぶんを入れ替え）
  console.log('4. 取引・精算');
  const transactions = [
    // 支出（各カテゴリ）
    { type: 'expense', amount: 5200, category: 'groceries', occurred_on: daysAgo(2), note: 'スーパー', payer_user_id: taroId, created_by: taroId },
    { type: 'expense', amount: 3800, category: 'dining', occurred_on: daysAgo(3), note: 'ランチ', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'expense', amount: 1500, category: 'daily', occurred_on: daysAgo(5), note: '日用品', payer_user_id: taroId, created_by: taroId },
    { type: 'expense', amount: 2200, category: 'medical', occurred_on: daysAgo(7), note: '薬', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'expense', amount: 18000, category: 'home', occurred_on: daysAgo(10), note: '家電', payer_user_id: taroId, created_by: taroId },
    { type: 'expense', amount: 4300, category: 'kids', occurred_on: daysAgo(12), note: '子ども用品', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'expense', amount: 980, category: 'other', occurred_on: daysAgo(14), note: 'その他', payer_user_id: taroId, created_by: taroId },
    // 収入
    { type: 'income', amount: 280000, category: 'salary', occurred_on: daysAgo(1), note: '給料', payer_user_id: taroId, created_by: taroId },
    { type: 'income', amount: 60000, category: 'sideline', occurred_on: daysAgo(6), note: '副業', payer_user_id: hanakoId, created_by: hanakoId },
    // 立替（世帯: advance_to_user_id = null）
    { type: 'advance', amount: 90000, category: 'home', occurred_on: daysAgo(8), note: '家賃立替', payer_user_id: taroId, advance_to_user_id: null, created_by: taroId },
    // 立替（個人: advance_to_user_id = 花子）
    { type: 'advance', amount: 7000, category: 'other', occurred_on: daysAgo(4), note: '花子の買い物立替', payer_user_id: taroId, advance_to_user_id: hanakoId, created_by: taroId },
  ].map((t) => ({ household_id: TEST_HOUSEHOLD_ID, ...t }));

  const settlements = [
    { household_id: TEST_HOUSEHOLD_ID, from_user_id: hanakoId, to_user_id: taroId, amount: 3000, settled_on: daysAgo(1), note: '一部精算', created_by: hanakoId },
  ];

  if (DRY_RUN) {
    console.log(`  transactions: ${transactions.length} 件`);
    console.log(`  settlements: ${settlements.length} 件`);
    console.log('[dry-run] DB は変更していません');
    return;
  }

  // 既存テスト世帯ぶんを削除してから再投入
  const { error: delSettle } = await admin
    .from('settlements')
    .delete()
    .eq('household_id', TEST_HOUSEHOLD_ID);
  if (delSettle) throw delSettle;
  const { error: delTx } = await admin
    .from('transactions')
    .delete()
    .eq('household_id', TEST_HOUSEHOLD_ID);
  if (delTx) throw delTx;

  const { error: txError } = await admin.from('transactions').insert(transactions);
  if (txError) throw txError;
  const { error: settleError } = await admin.from('settlements').insert(settlements);
  if (settleError) throw settleError;

  console.log(
    `  取引 ${transactions.length} 件 / 精算 ${settlements.length} 件 投入完了`
  );
  console.log('seed 完了');
}

main().catch((err) => {
  console.error('seed 失敗:', err);
  process.exit(1);
});
```

- [ ] **Step 2: dry-run で投入内容を確認**

Run: `pnpm --filter web seed:test -- --dry-run`
Expected: エラーなく `transactions: 11 件` / `settlements: 1 件` / `[dry-run] DB は変更していません` が表示される。

- [ ] **Step 3: 本番投入を実行**

Run: `pnpm --filter web seed:test`
Expected: `user 作成`（初回）または `user 既存`（再実行）、`取引 11 件 / 精算 1 件 投入完了`、`seed 完了` が表示される。

- [ ] **Step 4: 冪等性を確認（再実行）**

Run: `pnpm --filter web seed:test`
Expected: `user 既存` / `世帯 既存` となり、取引・精算は重複せず 11 件 / 1 件のまま（エラーなし）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/scripts/seed-test-data.ts
git commit -m "feat: テストデータ seed スクリプトを追加"
```

---

### Task 6: ローカル開発手順を CLAUDE.md に追記

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 手順セクションを追記**

`CLAUDE.md` の `## Environment Variables` セクションの直後に、以下のセクションを追加:

```markdown
## ローカル開発用テストログイン

ローカルで実データ付きの画面を確認するための仕組み（本番では無効）。

1. `apps/web/.env.local` に以下を設定:
   - `SUPABASE_SERVICE_ROLE_KEY`（seed 用）
   - `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true`
   - `NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL` / `_PASSWORD`, `NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL` / `_PASSWORD`
2. テストデータを投入: `pnpm --filter web seed:test`（`-- --dry-run` で確認のみ）
3. `pnpm --filter web dev` で起動し `/auth` を開く
4. 「テスト太郎でログイン」/「テスト花子でログイン」で即ログイン

**本番安全性**: dev-login は `NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'` のときだけ描画される。
Vercel など本番ではこの変数と資格情報変数を設定しないこと（未設定ならボタンは出ず、資格情報もバンドルされない）。

**テストアカウントの削除**: 不要になったら Supabase ダッシュボードの Authentication からテストユーザー
（`@example.com`）を削除し、`households` の「テスト世帯」（固定 UUID `00000000-0000-4000-8000-000000000001`）を削除する。
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: ローカル開発用テストログインの手順を追記"
```

---

### Task 7: 最終検証

**Files:** なし（検証のみ）

- [ ] **Step 1: lint**

Run: `pnpm --filter web lint`
Expected: エラーなし。

- [ ] **Step 2: type-check**

Run: `pnpm --filter web type-check`
Expected: エラーなし。

- [ ] **Step 3: 全テスト**

Run: `pnpm --filter web test`
Expected: 全テスト PASS（DevLoginButton 4 件を含む）。

- [ ] **Step 4: build**

Run: `pnpm --filter web build`
Expected: ビルド成功。

- [ ] **Step 5: 本番ガードの目視確認**

`apps/web/.env.local` の `NEXT_PUBLIC_ENABLE_DEV_LOGIN` を一時的に `false` にして `pnpm --filter web dev` を起動し、
`/auth` にテストログインボタンが**表示されない**ことを確認。確認後 `true` に戻す。

---

## Self-Review メモ

- spec の全要素（seed/DevLoginButton/env.example/auth差し込み/本番ガード/テスト/ドキュメント）に対応タスクあり。
- カテゴリキー・DB カラム名・型・関数名はコード調査で確定済みの値に統一。
- プレースホルダ無し（全ステップに実コード・実コマンド・期待出力あり）。
