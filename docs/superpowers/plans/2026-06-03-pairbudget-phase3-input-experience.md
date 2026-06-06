# PairBudget Phase 3（デザインシステム基盤 ＋ 入力体験）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DESIGN.md`(v1) の配色・丸ゴシックを実コードのトークン/フォント基盤として導入し、取引入力に「かんたん電卓」と任意の「場所」フィールド（過去サジェスト付き）を追加し、肥大化した `page.tsx` をビュー単位に分割する。

**Architecture:** Tailwind v4 の `@theme`/`:root`（`apps/web/src/app/globals.css`）に `--pb-*` ブランドトークンを定義し、shadcn のセマンティック変数へマッピングして既存コンポーネントを着せ替える。電卓は純粋ロジック（`lib/calculator.ts`）＋ shadcn Popover の薄い UI に分離して TDD する。「場所」はマイグレーション 009（`place` カラム＋`get_place_suggestions` RPC）→ 型 → service → zod → フォームの順で縦に通す。`page.tsx` は各 `TabsContent` を `*DashboardView` コンポーネントへ機械的に抽出する。

**Tech Stack:** Next.js 15.5.9（App Router, Turbopack）/ React 19.1.0 / TypeScript / Tailwind v4 / shadcn/ui (new-york) / react-hook-form 7 + zod 4 / Zustand / Supabase (Postgres + RLS) / Vitest + React Testing Library / lucide-react

> **検証で判明した前提（Codex レビュー反映）**: 実プロジェクトは **Next 15.5.9 / React 19.1.0 / zod 4**（CLAUDE.md の「Next 14」は古い）。`dev`/`build` は `--turbopack`。`services/transactions.ts` は **各関数内で `createClient()`**（モジュール singleton ではない）。`createTransaction`/`updateTransaction` は `(supabase as any)` で insert/update している。`amount` は DB で `NUMERIC(12,2)`＝**整数10桁上限**。`toTransactionData` は `lib/validations/transaction.ts` にある（モーダルではない）。

**基準ドキュメント:** リポジトリ直下 `DESIGN.md`（特に §2 カラー, §3 タイポ, §6 コンポーネント, §7 実装ガイド, §7-4 適用範囲）
**ブランチ:** `feature/design-system`（`DESIGN.md` を commit `c641b47` で追加済み）
**作業ディレクトリ:** 断りのない限りパスは `apps/web/` 起点。コマンドはリポジトリ直下から `pnpm --filter web ...`。

---

## スコープと進め方

4つのタスク群。各群は独立してマージ可能（群ごとに PR/コミットを分けてよい）。推奨順は A→B→C→D（B/C は A の上で見栄えが揃う）。

- **Group A**: デザイントークン ＋ フォント基盤（`globals.css`, `layout.tsx`）
- **Group B**: かんたん電卓（純粋ロジック＋Popover UI、取引フォームへ統合）
- **Group C**: 任意「場所」フィールド ＋ 過去サジェスト（マイグレーション009→型→service→zod→UI）
- **Group D**: `page.tsx` 分割（4つの `TabsContent` をビューコンポーネント化）

**DESIGN.md §7-4 の線引きを厳守**：ダッシュボードの全面再スキン・ダークモード・a11y 全面対応は **やらない（Phase 4 送り）**。本計画の着せ替えは「トークン定義＋触る画面（入力フォーム）への適用」まで。

---

## File Structure（作成/変更するファイルと責務）

**新規作成**
- `apps/web/src/lib/calculator.ts` — かんたん電卓の純粋ロジック（状態遷移と合計）。UI 非依存。
- `apps/web/src/lib/__tests__/calculator.test.ts` — calculator のユニットテスト。
- `apps/web/src/lib/validations/__tests__/transaction.test.ts` — zod スキーマ（`place` 追加分）のテスト。
- `apps/web/src/components/ui/popover.tsx` — shadcn Popover（CLI 生成）。
- `apps/web/src/components/transactions/AmountCalculatorPopover.tsx` — 電卓トリガー＋ポップオーバー UI。`onApply(total)` のみ外部へ。
- `apps/web/src/components/dashboard/MonthlyDashboardView.tsx` — 月次タブの中身。
- `apps/web/src/components/dashboard/YearlyDashboardView.tsx` — 年次タブの中身。
- `apps/web/src/components/dashboard/RecurringDashboardView.tsx` — 定期支出タブの中身。
- `apps/web/src/components/dashboard/RecurringIncomeDashboardView.tsx` — 定期収入タブの中身。
- `supabase/sql/009_add_transaction_place.sql` — `place` カラム＋サジェスト RPC。

**変更**
- `apps/web/src/app/globals.css` — `--pb-*` トークン、shadcn 変数マッピング、`@theme inline` 拡張、`--font-sans` 切替。
- `apps/web/src/app/layout.tsx` — フォントを M PLUS Rounded 1c に。`font-sans` を body に付与。
- `apps/web/src/components/modals/TransactionModal.tsx` — 金額欄に電卓、場所フィールド、サジェスト読み込み、`defaultValues`/`reset` に `place`。
- `apps/web/src/lib/validations/transaction.ts` — `transactionSchema` と `toTransactionData` に `place`（収入は null 固定）。
- `apps/web/src/types/transaction.ts` — `TransactionData`/`Transaction` に `place`。
- `apps/web/src/types/supabase.ts` — `transactions` 型に `place`、`Functions` に `get_place_suggestions`。
- `apps/web/src/services/transactions.ts` — `TRANSACTION_SELECT`/`mapTransaction`/`createTransaction`/`updateTransaction` に `place`、`getPlaceSuggestions()` 追加。
- `apps/web/src/app/page.tsx` — 4つの `TabsContent` を新ビューに差し替え。

---

# Group A — デザイントークン ＋ フォント基盤

DESIGN.md §7-1〜7-3 をそのまま実装に落とす。視覚変更なのでテストは「ビルド成功＋目視」で検証する（純粋ロジックではないため TDD 対象外）。

### Task 1: ブランドトークンと shadcn マッピングを globals.css に追加

**Files:**
- Modify: `apps/web/src/app/globals.css`（`:root` ブロックの末尾＝`--sidebar-ring` 行の直後・閉じ `}` の直前に挿入。`@theme inline` ブロックも編集）

- [ ] **Step 1: `:root` の末尾に PairBudget トークンと shadcn 上書きを追加**

`:root { ... }` の最後の宣言（`--sidebar-ring: oklch(0.708 0 0);`）と閉じ `}` の間に、以下を挿入する（後勝ちで既存の neutral/oklch を上書きする）。

```css
  /* === PairBudget brand tokens (DESIGN.md v1) === */
  --pb-primary: #5b6cf0;
  --pb-primary-hover: #4a57d6;
  --pb-primary-active: #3c49b8;
  --pb-primary-soft: #e7e9fe;
  --pb-on-primary: #ffffff;

  --pb-income: #23a082;
  --pb-income-soft: #dcf3ec;
  --pb-expense: #f2566b;
  --pb-expense-soft: #ffe9ec;

  --pb-coral: #ff7a8a;
  --pb-amber: #ffc857;
  --pb-amber-deep: #e8a93c;
  --pb-amber-soft: #fff1d6;
  --pb-danger: #e5484d;

  --pb-bg: #fbfaff;
  --pb-surface: #ffffff;
  --pb-border: #ececf3;
  --pb-ink: #2a2a40;
  --pb-muted: #6e6e85;
  --pb-faint: #9a9ab0;

  --pb-shadow-sm: 0 2px 6px rgba(40, 40, 80, 0.06);
  --pb-shadow-md: 0 6px 20px rgba(40, 40, 80, 0.06);
  --pb-shadow-lg: 0 10px 34px rgba(40, 40, 80, 0.1);
  --pb-shadow-primary: 0 6px 16px rgba(91, 108, 240, 0.3);

  --pb-radius-sm: 10px;
  --pb-radius-md: 13px;
  --pb-radius-lg: 18px;
  --pb-radius-xl: 24px;

  /* === shadcn semantic vars → brand (override neutral defaults) === */
  --radius: 0.8125rem; /* 13px = --pb-radius-md */
  --background: var(--pb-bg);
  --foreground: var(--pb-ink);
  --card: var(--pb-surface);
  --card-foreground: var(--pb-ink);
  --popover: var(--pb-surface);
  --popover-foreground: var(--pb-ink);
  --primary: var(--pb-primary);
  --primary-foreground: var(--pb-on-primary);
  --secondary: var(--pb-primary-soft);
  --secondary-foreground: var(--pb-primary-hover);
  --muted: #f2f1fa;
  --muted-foreground: var(--pb-muted);
  --accent: var(--pb-primary-soft);
  --accent-foreground: var(--pb-primary-hover);
  --destructive: var(--pb-danger);
  --border: var(--pb-border);
  --input: var(--pb-border);
  --ring: var(--pb-primary);
```

- [ ] **Step 2: `@theme inline` に PairBudget カラーユーティリティとフォントを追加**

`@theme inline { ... }` 内の `--font-sans: var(--font-geist-sans);` を次の行に置き換える：

```css
  --font-sans: var(--font-rounded);
```

さらに同ブロック内（例えば `--color-card: var(--card);` 群の近く）に以下を追加する。これで `bg-pb-income` `text-pb-expense` 等のユーティリティが使えるようになる：

```css
  --color-pb-primary: var(--pb-primary);
  --color-pb-primary-soft: var(--pb-primary-soft);
  --color-pb-income: var(--pb-income);
  --color-pb-income-soft: var(--pb-income-soft);
  --color-pb-expense: var(--pb-expense);
  --color-pb-expense-soft: var(--pb-expense-soft);
  --color-pb-coral: var(--pb-coral);
  --color-pb-amber: var(--pb-amber);
  --color-pb-danger: var(--pb-danger);
  --color-pb-bg: var(--pb-bg);
  --color-pb-surface: var(--pb-surface);
  --color-pb-ink: var(--pb-ink);
  --color-pb-muted: var(--pb-muted);
  --color-pb-faint: var(--pb-faint);
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `pnpm --filter web build`
Expected: ビルド成功（CSS パースエラーなし）。

- [ ] **Step 4: コミット**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat: デザイントークン(--pb-*)を導入しshadcn変数へマッピング (DESIGN.md §7-1,7-2)"
```

### Task 2: フォントを M PLUS Rounded 1c に切り替え

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: フォント import と定義を差し替え**

冒頭の `import { Geist, Geist_Mono } from "next/font/google";` を以下に置き換え、`geistSans` 定義（`const geistSans = Geist({ ... });`）を `rounded` 定義に置き換える：

```tsx
import { M_PLUS_Rounded_1c, Geist_Mono } from "next/font/google";

const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"], // 日本語グリフは大きいため latin サブセット指定
  display: "swap",
  preload: false, // 巨大プリロードを避ける
  fallback: ["Hiragino Maru Gothic ProN", "Hiragino Sans", "system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

- [ ] **Step 2: body の className を更新**

`<body className={\`${geistSans.variable} ${geistMono.variable} antialiased\`}>` を以下へ：

```tsx
      <body
        className={`${rounded.variable} ${geistMono.variable} font-sans antialiased`}
      >
```

（`font-sans` を明示付与し、`--font-sans`＝丸ゴシックを body に適用する。）

- [ ] **Step 3: 開発サーバで日本語表示を実機確認（要検証ポイント）**

Run: `pnpm --filter web dev` → ブラウザで `http://localhost:3000` を開く。
Expected: 見出し・本文の**日本語が丸ゴシック**で表示される。
**確認方法（目視だけにしない）**: `fallback` に Hiragino Maru Gothic を入れたため、macOS では日本語が丸ゴで出ても「Web フォントが落ちて OS フォントにフォールバックしている」可能性がある。DevTools の Network で `M_PLUS_Rounded_1c` の woff2 が読まれているか、Computed の `font-family` が `--font-rounded`（`__M_PLUS_Rounded_1c_*`）になっているかを確認する。
**もし Web フォントが日本語に効かない場合**（`subsets: ["latin"]` で日本語グリフが落ちている）: `next/font/local` で self-host するか、`app/layout.tsx` で `<link>` 読み込みに切替（DESIGN.md §7-3 の注記）。この分岐に入ったら対応をコミットメッセージに明記。

- [ ] **Step 4: ビルド確認**

Run: `pnpm --filter web build`
Expected: 成功。

- [ ] **Step 5: コミット**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat: UIフォントをM PLUS Rounded 1c(丸ゴシック)に変更 (DESIGN.md §7-3)"
```

---

# Group B — かんたん電卓

金額入力欄の右に電卓ボタン。押すとポップオーバーで足し算し、「金額に入れる」で金額欄へ反映（フル電卓にはしない）。計算は純粋関数に分離して TDD する。

### Task 3: 電卓の純粋ロジック（TDD）

> **制約メモ（Codex 指摘反映）**: 電卓は整数の足し算のみ（小数なし・**10桁上限**）。既存 `amountSchema`（`lib/validations/transaction.ts`）は小数・桁上限を強制しないが、それは本計画の対象外。電卓側で整数10桁に収め、DB の `NUMERIC(12,2)`（整数10桁）超過を避ける。amount への `.int()`/`.max()` 追加は別タスク。

**Files:**
- Create: `apps/web/src/lib/calculator.ts`
- Test: `apps/web/src/lib/__tests__/calculator.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`apps/web/src/lib/__tests__/calculator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  backspace,
  calcTotal,
  clearCalc,
  formatCalcTape,
  initialCalcState,
  inputDigit,
  pressPlus,
} from '@/lib/calculator';

describe('inputDigit', () => {
  it('数字を current に追記する', () => {
    let s = initialCalcState;
    s = inputDigit(s, '1');
    s = inputDigit(s, '2');
    expect(s.current).toBe('12');
  });

  it('先頭の余分な 0 を置き換える', () => {
    let s = inputDigit(initialCalcState, '0');
    s = inputDigit(s, '5');
    expect(s.current).toBe('5');
  });

  it('10桁を超える入力は無視する（DB amount=NUMERIC(12,2)）', () => {
    let s = initialCalcState;
    for (let i = 0; i < 15; i++) s = inputDigit(s, '9');
    expect(s.current).toHaveLength(10);
  });
});

describe('pressPlus', () => {
  it('current を entries に確定し current を空にする', () => {
    let s = inputDigit(initialCalcState, '8');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0');
    s = pressPlus(s);
    expect(s.entries).toEqual([800]);
    expect(s.current).toBe('');
  });

  it('current が空なら何もしない', () => {
    const s = pressPlus(initialCalcState);
    expect(s).toEqual(initialCalcState);
  });
});

describe('backspace', () => {
  it('current の末尾を削る', () => {
    let s = inputDigit(initialCalcState, '1');
    s = inputDigit(s, '2');
    s = backspace(s);
    expect(s.current).toBe('1');
  });

  it('current が空なら直前の entry を current に戻す', () => {
    let s = inputDigit(initialCalcState, '5');
    s = pressPlus(s); // entries=[5], current=''
    s = backspace(s);
    expect(s.entries).toEqual([]);
    expect(s.current).toBe('5');
  });
});

describe('calcTotal', () => {
  it('entries と current を合算する', () => {
    let s = inputDigit(initialCalcState, '1');
    s = inputDigit(s, '2');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0'); // 1200
    s = pressPlus(s);
    s = inputDigit(s, '8');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0'); // 800
    expect(calcTotal(s)).toBe(2000);
  });

  it('初期状態は 0', () => {
    expect(calcTotal(initialCalcState)).toBe(0);
  });
});

describe('formatCalcTape', () => {
  it('項を ＋ 区切りで桁区切り表示する', () => {
    let s = inputDigit(initialCalcState, '1');
    s = inputDigit(s, '2');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0');
    s = pressPlus(s);
    s = inputDigit(s, '8');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0');
    expect(formatCalcTape(s)).toBe('1,200 ＋ 800');
  });

  it('空なら 0 を返す', () => {
    expect(formatCalcTape(initialCalcState)).toBe('0');
  });
});

describe('clearCalc', () => {
  it('初期状態に戻す', () => {
    expect(clearCalc()).toEqual(initialCalcState);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter web test -- calculator`
Expected: FAIL（`@/lib/calculator` が存在しない）。

- [ ] **Step 3: 実装する**

`apps/web/src/lib/calculator.ts`:

```ts
/**
 * かんたん電卓の純粋ロジック。
 * UI に依存しない状態遷移と合計計算のみを担う（フル電卓ではなく足し算専用）。
 */

export interface CalcState {
  /** 確定済みの加算項 */
  entries: number[];
  /** 入力中の数値文字列 */
  current: string;
}

export const initialCalcState: CalcState = { entries: [], current: '' };

/** 数字を 1 文字入力する。先頭の余分な 0 を避け、10 桁を上限にする（DB amount=NUMERIC(12,2)=整数10桁）。 */
export function inputDigit(state: CalcState, digit: string): CalcState {
  const next = state.current === '0' ? digit : state.current + digit;
  if (next.length > 10) {
    return state;
  }
  return { ...state, current: next };
}

/** current を entries へ確定し、current を空にする（足し算の「＋」）。 */
export function pressPlus(state: CalcState): CalcState {
  if (state.current === '') {
    return state;
  }
  return { entries: [...state.entries, Number(state.current)], current: '' };
}

/** 1 文字削除。current が空なら直前の entry を current に戻す。 */
export function backspace(state: CalcState): CalcState {
  if (state.current !== '') {
    return { ...state, current: state.current.slice(0, -1) };
  }
  if (state.entries.length > 0) {
    const entries = state.entries.slice();
    const last = entries.pop() as number;
    return { entries, current: String(last) };
  }
  return state;
}

/** 初期状態に戻す。 */
export function clearCalc(): CalcState {
  return { entries: [], current: '' };
}

/** entries と current の合計を返す。 */
export function calcTotal(state: CalcState): number {
  const currentValue = state.current === '' ? 0 : Number(state.current);
  return state.entries.reduce((sum, n) => sum + n, 0) + currentValue;
}

/** "1,200 ＋ 800" のような途中式を返す。空なら "0"。 */
export function formatCalcTape(state: CalcState): string {
  const parts = state.entries.map((n) => n.toLocaleString());
  if (state.current !== '') {
    parts.push(Number(state.current).toLocaleString());
  }
  return parts.length ? parts.join(' ＋ ') : '0';
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter web test -- calculator`
Expected: PASS（全ケース）。

- [ ] **Step 5: コミット**

```bash
git add apps/web/src/lib/calculator.ts apps/web/src/lib/__tests__/calculator.test.ts
git commit -m "feat: かんたん電卓の純粋ロジックを追加(TDD)"
```

### Task 4: shadcn Popover を導入

**Files:**
- Create: `apps/web/src/components/ui/popover.tsx`（CLI 生成）

- [ ] **Step 1: shadcn CLI で Popover を追加**

Run: `cd apps/web && pnpm dlx shadcn@latest add popover`
Expected: `src/components/ui/popover.tsx` が生成され、`@radix-ui/react-popover` が依存に追加される。
（CLI が対話を要求する場合は既定で進める。生成後は必ず作業ディレクトリをリポジトリ直下へ戻す。）

- [ ] **Step 2: 生成物とビルドを確認**

Run: `pnpm --filter web build`
Expected: 成功。`src/components/ui/popover.tsx` が存在し `Popover`/`PopoverTrigger`/`PopoverContent` をエクスポート。

- [ ] **Step 3: コミット**

```bash
git add apps/web/src/components/ui/popover.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "chore: shadcn Popover を追加(電卓ポップオーバー用)"
```

### Task 5: 電卓ポップオーバー UI を作る

**Files:**
- Create: `apps/web/src/components/transactions/AmountCalculatorPopover.tsx`

- [ ] **Step 1: コンポーネントを実装**

`apps/web/src/components/transactions/AmountCalculatorPopover.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Calculator as CalculatorIcon, Delete } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  backspace,
  calcTotal,
  formatCalcTape,
  initialCalcState,
  inputDigit,
  pressPlus,
  type CalcState,
} from '@/lib/calculator';

interface AmountCalculatorPopoverProps {
  /** 「金額に入れる」押下時に合計を渡す */
  onApply: (total: number) => void;
  disabled?: boolean;
}

const DIGIT_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const;

export function AmountCalculatorPopover({ onApply, disabled }: AmountCalculatorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CalcState>(initialCalcState);

  const total = calcTotal(state);
  const reset = () => setState(initialCalcState);

  const handleApply = () => {
    onApply(total);
    reset();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="かんたん電卓を開く"
          disabled={disabled}
          className="flex w-12 shrink-0 items-center justify-center rounded-[13px] bg-pb-primary-soft text-[var(--pb-primary-hover)] shadow-[inset_0_0_0_1.5px_var(--pb-border)] disabled:opacity-50"
        >
          <CalculatorIcon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-2xl p-3">
        <div className="text-right text-xs text-pb-faint">{formatCalcTape(state)}</div>
        <div className="mb-2 text-right text-2xl font-extrabold text-pb-ink">
          {total.toLocaleString()}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {DIGIT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setState((s) => inputDigit(s, key))}
              className="rounded-[10px] bg-pb-bg py-2 text-base font-bold"
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            aria-label="足す"
            onClick={() => setState((s) => pressPlus(s))}
            className="rounded-[10px] bg-pb-primary-soft py-2 text-base font-bold text-[var(--pb-primary-hover)]"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => setState((s) => inputDigit(s, '0'))}
            className="rounded-[10px] bg-pb-bg py-2 text-base font-bold"
          >
            0
          </button>
          <button
            type="button"
            aria-label="1文字削除"
            onClick={() => setState((s) => backspace(s))}
            className="flex items-center justify-center rounded-[10px] bg-pb-expense-soft py-2 text-pb-expense"
          >
            <Delete className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-[10px] bg-pb-primary-soft py-2 text-xs font-bold text-pb-muted"
          >
            クリア
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[1.4] rounded-[10px] bg-pb-primary py-2 text-xs font-extrabold text-white"
          >
            金額に入れる
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: 型チェック/ビルド確認**

Run: `pnpm --filter web build`
Expected: 成功（`bg-pb-*`/`text-pb-*` ユーティリティは Task 1 で生成済み）。

- [ ] **Step 3: コミット**

```bash
git add apps/web/src/components/transactions/AmountCalculatorPopover.tsx
git commit -m "feat: かんたん電卓ポップオーバーUIを追加"
```

### Task 6: 取引フォームの金額欄に電卓を統合

**Files:**
- Modify: `apps/web/src/components/modals/TransactionModal.tsx`（金額欄＝現状 L271-284 付近）

- [ ] **Step 1: import を追加**

ファイル上部の import 群に追加：

```tsx
import { AmountCalculatorPopover } from '@/components/transactions/AmountCalculatorPopover';
```

- [ ] **Step 2: 金額欄を電卓ボタン付きに置き換える**

金額欄の現状：

```tsx
<div className="space-y-2">
  <Label htmlFor="amount">金額</Label>
  <Input
    id="amount"
    type="number"
    min={1}
    step="1"
    placeholder="金額を入力"
    disabled={isSubmitting}
    {...register('amount', { valueAsNumber: true })}
  />
  {errors.amount && (
    <p className="text-sm text-red-500">{errors.amount.message}</p>
  )}
</div>
```

を以下に置き換える（`Input` を flex で電卓ボタンと横並びにし、`onApply` で `setValue` する。`setValue` は既存の `useForm` 分割代入に含まれている）：

```tsx
<div className="space-y-2">
  <Label htmlFor="amount">金額</Label>
  <div className="flex gap-2">
    <Input
      id="amount"
      type="number"
      min={1}
      step="1"
      placeholder="金額を入力"
      disabled={isSubmitting}
      className="flex-1"
      {...register('amount', { valueAsNumber: true })}
    />
    <AmountCalculatorPopover
      disabled={isSubmitting}
      onApply={(total) => setValue('amount', total, { shouldValidate: true })}
    />
  </div>
  {errors.amount && (
    <p className="text-sm text-red-500">{errors.amount.message}</p>
  )}
</div>
```

- [ ] **Step 3: 手動で動作確認**

Run: `pnpm --filter web dev` → 取引登録モーダルを開く → 金額欄右の電卓ボタン → `1200 ＋ 800` →「金額に入れる」。
Expected: 金額欄が `2000` になり、そのまま保存できる。

- [ ] **Step 4: ビルド確認とコミット**

Run: `pnpm --filter web build`
Expected: 成功。

```bash
git add apps/web/src/components/modals/TransactionModal.tsx
git commit -m "feat: 取引フォームの金額欄にかんたん電卓を統合"
```

---

# Group C — 任意「場所」フィールド ＋ 過去サジェスト

`transactions` に `place TEXT`（任意）を追加。支出/立替で入力でき、過去入力を `<datalist>` でサジェスト。マイグレーション→型→service→zod→UI の順で縦に通す。

### Task 7: マイグレーション 009（place カラム ＋ サジェスト RPC）

**Files:**
- Create: `supabase/sql/009_add_transaction_place.sql`

- [ ] **Step 1: マイグレーションを書く**

`supabase/sql/009_add_transaction_place.sql`（既存 005 の書式＝`BEGIN`/`COMMIT`・区切りコメント・冪等化に倣う）:

```sql
-- 009_add_transaction_place.sql
-- transactions に任意の place（場所）カラムと、過去 place のサジェスト取得関数を追加

BEGIN;

----------------------------
-- 1. place カラム追加
----------------------------

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS place TEXT;

-- 50文字上限（zod と DB を一致させる。冪等化のため存在チェック）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_place_len_chk'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_place_len_chk
      CHECK (place IS NULL OR char_length(place) <= 50);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_household_place
  ON public.transactions(household_id, place);

----------------------------
-- 2. place サジェスト取得関数
----------------------------

CREATE OR REPLACE FUNCTION public.get_place_suggestions(target_household UUID)
RETURNS TABLE (place TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.place
  FROM public.transactions t
  WHERE t.household_id = target_household
    AND public.is_household_member(target_household)
    AND t.place IS NOT NULL
    AND t.place <> ''
  ORDER BY t.place ASC;
$$;

----------------------------
-- 3. 実行権限
----------------------------

GRANT EXECUTE ON FUNCTION public.get_place_suggestions(UUID) TO authenticated;

COMMIT;
```

> RPC 内で `is_household_member(target_household)` を呼び、SECURITY DEFINER でも他世帯の place が漏れないようにする（既存 RLS ヘルパーを再利用）。

- [ ] **Step 2: dry-run で検証**

Run: `supabase db push --config supabase/config.toml --dry-run`
Expected: 009 が新規差分として認識され、エラーなし。

- [ ] **Step 3: 適用（ユーザー環境）**

Run: `supabase db push --config supabase/config.toml`
Expected: 009 が適用される。
（ローカル DB が無い場合はこの適用をユーザーに委ね、本タスクのコミットは SQL 追加までで進める。）

- [ ] **Step 4: コミット**

```bash
git add supabase/sql/009_add_transaction_place.sql
git commit -m "feat: transactions に place カラムとサジェストRPCを追加(migration 009)"
```

### Task 8: 型に place を反映

**Files:**
- Modify: `apps/web/src/types/transaction.ts`
- Modify: `apps/web/src/types/supabase.ts`

- [ ] **Step 1: ドメイン型に place を追加**

`apps/web/src/types/transaction.ts` の `TransactionData` と `Transaction` にそれぞれ追加：

`TransactionData`（既存フィールド群の末尾、`advanceToUserId?` の後）:

```ts
  /** 場所（任意・支出/立替のみ） */
  place?: string | null;
```

`Transaction`（既存 `advanceToUserId: string | null;` の後）:

```ts
  place: string | null;
```

- [ ] **Step 2: supabase.ts の transactions 型に place を追加**

`apps/web/src/types/supabase.ts` の `transactions` の `Row`/`Insert`/`Update` に追加（アルファベット順に倣い `payer_user_id` の前あたり）：

- `Row`: `place: string | null`
- `Insert`: `place?: string | null`
- `Update`: `place?: string | null`

- [ ] **Step 3: rpc の型方針（Functions 手編集は不要）**

`get_place_suggestions` の呼び出しは Task 9 の service 側で `(supabase as any).rpc(...)`（既存 `createTransaction`/`updateTransaction` の insert/update と同じ `as any` 方式）にするため、`Database['public']['Functions']` の手編集は**不要**。
理想は migration 009 適用後に `supabase gen types typescript ...` で型を再生成し（CLAUDE.md PB-66）、`place` 列・Functions をまとめて自動反映させること。本タスクの手編集（place 列の Row/Insert/Update）は再生成までの暫定。

- [ ] **Step 4: 型チェック**

Run: `pnpm --filter web build`
Expected: 成功（後続 Task 9 で service が place を使うまで未使用でも型エラーなし）。

- [ ] **Step 5: コミット**

```bash
git add apps/web/src/types/transaction.ts apps/web/src/types/supabase.ts
git commit -m "feat: place を型(transaction/supabase)に追加"
```

### Task 9: service に place の読み書き と サジェスト取得を追加

**Files:**
- Modify: `apps/web/src/services/transactions.ts`

- [ ] **Step 1: SELECT に place を追加**

`TRANSACTION_SELECT` テンプレートに `note,` の次の行として `place,` を追加。

- [ ] **Step 2: mapTransaction に place を追加**

`mapTransaction` の return オブジェクトに追加：

```ts
    place: row.place,
```

- [ ] **Step 3: createTransaction の payload に place を追加**

`payload` の `note:` 行の後に追加：

```ts
    place: input.place?.trim() ? input.place.trim() : null,
```

- [ ] **Step 4: updateTransaction の payload 構築に place を追加**

`updateTransaction` で各フィールドを `if (input.xxx !== undefined)` で条件付き設定している箇所に倣い、追加：

```ts
  if (input.place !== undefined) {
    payload.place = input.place?.trim() ? input.place.trim() : null;
  }
```

（確認済：`updateTransaction` は `if (input.note !== undefined) { payload.note = input.note?.trim() ? input.note.trim() : null; }` の形。同じスタイルで `place` を追加する。`payload` 型は `Partial<...['Update']>` なので Task 8 の Update に place が必要。）

- [ ] **Step 5: getPlaceSuggestions を追加**

ファイル末尾に追加（**既存関数と同じく `createClient()` を関数内で呼ぶ**。`createClient` の import は既存のものを使う）：

```ts
/**
 * 世帯内の過去の場所（place）をサジェスト用に取得する。
 * @returns 重複なし・昇順の場所リスト。失敗時は空配列。
 */
export async function getPlaceSuggestions(householdId: string): Promise<string[]> {
  const supabase = createClient();

  // rpc は既存の insert/update と同様に型アサーションで通す（Functions 型未生成のため）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_place_suggestions', {
    target_household: householdId,
  });

  if (error) {
    console.error('場所サジェスト取得エラー:', error);
    return [];
  }

  return ((data ?? []) as { place: string | null }[])
    .map((row) => row.place)
    .filter((place): place is string => Boolean(place));
}
```

- [ ] **Step 6: 型チェック**

Run: `pnpm --filter web build`
Expected: 成功。

- [ ] **Step 7: コミット**

```bash
git add apps/web/src/services/transactions.ts
git commit -m "feat: service に place の読み書きとサジェスト取得を追加"
```

### Task 10: zod スキーマに place を追加（TDD）

**Files:**
- Modify: `apps/web/src/lib/validations/transaction.ts`
- Test: `apps/web/src/lib/validations/__tests__/transaction.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`apps/web/src/lib/validations/__tests__/transaction.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { transactionSchema } from '@/lib/validations/transaction';

const base = {
  type: 'expense' as const,
  amount: 1000,
  occurredOn: '2026-06-03',
  category: 'groceries',
  isHouseholdAdvance: false,
  payerUserId: '00000000-0000-0000-0000-000000000001',
  advanceToUserId: null,
};

describe('transactionSchema の place', () => {
  it('place 未指定でも通る', () => {
    const result = transactionSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('50文字以内の place は通る', () => {
    const result = transactionSchema.safeParse({ ...base, place: 'スーパー' });
    expect(result.success).toBe(true);
  });

  it('50文字超の place は弾く', () => {
    const result = transactionSchema.safeParse({ ...base, place: 'あ'.repeat(51) });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter web test -- validations/__tests__/transaction`
Expected: FAIL（50文字超でも `success: true` になる、または place 未定義）。

- [ ] **Step 3: スキーマに place を追加**

`transactionSchema` の `.object({ ... })` 内、`note` の定義の後に追加：

```ts
    /** 場所（任意） */
    place: z
      .string()
      .max(50, '場所は50文字以内で入力してください')
      .optional()
      .nullable(),
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter web test -- validations/__tests__/transaction`
Expected: PASS。

- [ ] **Step 5: コミット**

```bash
git add apps/web/src/lib/validations/transaction.ts apps/web/src/lib/validations/__tests__/transaction.test.ts
git commit -m "feat: zod transactionSchema に place を追加(TDD)"
```

### Task 11: 取引フォームに場所フィールド＋サジェストを追加

**Files:**
- Modify: `apps/web/src/components/modals/TransactionModal.tsx`

- [ ] **Step 1: import と state を追加**

import 群に：

```tsx
// 既存の `import { useEffect, useMemo } from 'react';` を useState 追加に変更：
import { useEffect, useMemo, useState } from 'react';
// service から追加 import：
import { getPlaceSuggestions } from '@/services/transactions';
```

コンポーネント本体（`watch(...)` 群の付近）に：

```tsx
const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);
```

- [ ] **Step 2: モーダルオープン時にサジェストを読み込む**

既存の「open 時にリセットする」`useEffect` の近くに、新しい `useEffect` を追加（`householdId` はこのコンポーネントの props として既に受け取っている＝`toTransactionData(data, householdId)` で使用済み）：

```tsx
useEffect(() => {
  if (open && householdId) {
    getPlaceSuggestions(householdId)
      .then(setPlaceSuggestions)
      .catch(() => setPlaceSuggestions([]));
  }
}, [open, householdId]);
```

- [ ] **Step 3: defaultValues と reset() の既定値に place を追加**

`useForm({ defaultValues: { ... } })`（初期値）と、open 時 `useEffect` 内の `reset({ ... })` 2箇所に `place` を追加：
- `useForm` の defaultValues: `place: '',`
- 編集モード reset: `place: editingTransaction.place ?? '',`
- 新規モード reset: `place: '',`

- [ ] **Step 4: 場所フィールドの JSX を追加**

メモ（note）欄の後・支払者ブロックの前に追加。`transactionType` は既存の `watch('type')` の値。収入では出さない：

```tsx
{transactionType !== 'income' && (
  <div className="space-y-2">
    <Label htmlFor="place">場所（任意）</Label>
    <Input
      id="place"
      type="text"
      list="place-suggestions"
      placeholder="例：スーパー、コンビニ"
      disabled={isSubmitting}
      {...register('place')}
    />
    <datalist id="place-suggestions">
      {placeSuggestions.map((p) => (
        <option key={p} value={p} />
      ))}
    </datalist>
  </div>
)}
```

- [ ] **Step 5: toTransactionData（`lib/validations/transaction.ts`）に place を含める**

`toTransactionData` の return オブジェクト末尾（`advanceToUserId: resolvedAdvanceToUserId,` の後）に追加。**収入では場所を保存しない**（収入タブに切替後も支出で入力した place が残って保存されるのを防ぐため `resolvedType` で判定）：

```ts
    place: resolvedType === 'income' ? null : (data.place?.trim() ? data.place.trim() : null),
```

- [ ] **Step 6: 手動で動作確認**

Run: `pnpm --filter web dev` → 支出登録で場所に「スーパー」を入れて保存 → もう一度モーダルを開き場所欄をフォーカス。
Expected: 保存できる。2回目に「スーパー」がサジェスト候補に出る（009 適用済み環境のみ）。収入タブでは場所欄が出ない。

- [ ] **Step 7: ビルド確認とコミット**

Run: `pnpm --filter web build`
Expected: 成功。

```bash
git add apps/web/src/components/modals/TransactionModal.tsx
git commit -m "feat: 取引フォームに任意の場所フィールドと過去サジェストを追加"
```

> **任意フォローアップ（本計画外）**: `RecentTransactions`/`MonthlyCategoryBreakdown` の明細に place を小さく表示。必要になったら別タスクで。

---

# Group D — page.tsx 分割

674 行の `apps/web/src/app/page.tsx` を、各 `TabsContent` の中身を `*DashboardView` に抽出して軽量化する。**振る舞いを変えない純粋なリファクタ**。各タスクは「新コンポーネント作成 → page.tsx で差し替え → ビルド＋目視で同一動作を確認」。

> フォーム共通化は調査の結果 `TransactionModal` が追加/編集を既に統合済みのため、本計画では新規作業を行わない（YAGNI）。`page.tsx` 分割が「肥大化解消」の主目的。

各ビューに渡す props は、対応する子コンポーネントが必要とする値（調査済み）に一致させる。抽出は「page.tsx 内の該当 JSX をそのまま新ファイルへ移し、必要な値を props 経由で受け取る」機械的な移動。

### Task 12: YearlyDashboardView を抽出

**Files:**
- Create: `apps/web/src/components/dashboard/YearlyDashboardView.tsx`
- Modify: `apps/web/src/app/page.tsx`（年次 `TabsContent`＝現状 L617-620 付近）

- [ ] **Step 1: コンポーネントを作成**

`apps/web/src/components/dashboard/YearlyDashboardView.tsx`（`YearlySummaryCards` は `summary`/`isLoading`、`YearlyBalanceChart` は `data`/`isLoading`/`defaultMetric` を要求）:

```tsx
import { YearlySummaryCards } from '@/components/dashboard/YearlySummaryCards';
import { YearlyBalanceChart } from '@/components/dashboard/YearlyBalanceChart';
import type { ComponentProps } from 'react';

interface YearlyDashboardViewProps {
  summary: ComponentProps<typeof YearlySummaryCards>['summary'];
  chartData: ComponentProps<typeof YearlyBalanceChart>['data'];
  isLoading: boolean;
}

export function YearlyDashboardView({ summary, chartData, isLoading }: YearlyDashboardViewProps) {
  return (
    <>
      <YearlySummaryCards summary={summary} isLoading={isLoading} />
      <YearlyBalanceChart data={chartData} isLoading={isLoading} />
    </>
  );
}
```

（確認済：page.tsx は `<TabsContent value="yearly" className="space-y-6">` 直下に2コンポーネント・`defaultMetric` 無し。**フラグメントを返し**、spacing は TabsContent 側に残すので二重ラップにならない。両子とも `yearlyLoading` を使うため `isLoading` 一本でよい。）

- [ ] **Step 2: page.tsx で差し替え**

import を追加し、年次 `TabsContent` 内の 2 コンポーネント（`YearlySummaryCards` + `YearlyBalanceChart`）を `<YearlyDashboardView summary={yearlySummary} chartData={yearlyChartData} isLoading={yearlyLoading} />` に置き換える。不要になった子 import は残ってよい（lint で警告が出たら削除）。

- [ ] **Step 3: 動作・ビルド確認**

Run: `pnpm --filter web build` ＆ `pnpm --filter web lint`
Expected: 成功。`dev` で年次タブが従来通り表示される。

- [ ] **Step 4: コミット**

```bash
git add apps/web/src/components/dashboard/YearlyDashboardView.tsx apps/web/src/app/page.tsx
git commit -m "refactor: 年次タブを YearlyDashboardView に抽出"
```

### Task 13: RecurringDashboardView と RecurringIncomeDashboardView を抽出

**Files:**
- Create: `apps/web/src/components/dashboard/RecurringDashboardView.tsx`
- Create: `apps/web/src/components/dashboard/RecurringIncomeDashboardView.tsx`
- Modify: `apps/web/src/app/page.tsx`（L622-629 と L631-638 付近）

- [ ] **Step 1: RecurringDashboardView を作成**

`RecurringExpenseList` は `householdId`/`members`/`recurringExpenses`/`isLoading` を要求：

```tsx
import { RecurringExpenseList } from '@/components/dashboard/RecurringExpenseList';
import type { ComponentProps } from 'react';

type ListProps = ComponentProps<typeof RecurringExpenseList>;

interface RecurringDashboardViewProps {
  householdId: ListProps['householdId'];
  members: ListProps['members'];
  recurringExpenses: ListProps['recurringExpenses'];
  isLoading: ListProps['isLoading'];
}

export function RecurringDashboardView(props: RecurringDashboardViewProps) {
  return <RecurringExpenseList {...props} />;
}
```

- [ ] **Step 2: RecurringIncomeDashboardView を作成**

`RecurringIncomeList` は `householdId`/`members`/`recurringIncomes`/`isLoading` を要求：

```tsx
import { RecurringIncomeList } from '@/components/dashboard/RecurringIncomeList';
import type { ComponentProps } from 'react';

type ListProps = ComponentProps<typeof RecurringIncomeList>;

interface RecurringIncomeDashboardViewProps {
  householdId: ListProps['householdId'];
  members: ListProps['members'];
  recurringIncomes: ListProps['recurringIncomes'];
  isLoading: ListProps['isLoading'];
}

export function RecurringIncomeDashboardView(props: RecurringIncomeDashboardViewProps) {
  return <RecurringIncomeList {...props} />;
}
```

- [ ] **Step 3: page.tsx で差し替え**

それぞれの `TabsContent` 内の `RecurringExpenseList` / `RecurringIncomeList` を新ビューに置き換え、対応する props（`household.id`, `members`, `recurringExpenses`/`recurringIncomes`, `recurringExpensesLoading`/`recurringIncomesLoading`）を渡す。page.tsx が元々渡していた props 名に正確に合わせる。

- [ ] **Step 4: ビルド・lint・目視確認**

Run: `pnpm --filter web build && pnpm --filter web lint`
Expected: 成功。定期支出/定期収入タブが従来通り。

- [ ] **Step 5: コミット**

```bash
git add apps/web/src/components/dashboard/RecurringDashboardView.tsx apps/web/src/components/dashboard/RecurringIncomeDashboardView.tsx apps/web/src/app/page.tsx
git commit -m "refactor: 定期支出/定期収入タブをビューコンポーネントに抽出"
```

### Task 14: MonthlyDashboardView を抽出

**Files:**
- Create: `apps/web/src/components/dashboard/MonthlyDashboardView.tsx`
- Modify: `apps/web/src/app/page.tsx`（月次 `TabsContent`＝現状 L574-615 付近）

月次タブは子が多い（`VariableExpenseReminderBanner`, `IncomeReminderBanner`, `SummaryCards`, `MonthlyCategoryBreakdown`, `BalanceCard`, `RecentTransactions`）。props も多いので、各子の props を `ComponentProps` で借りて素直に列挙する。

- [ ] **Step 1: コンポーネントを作成**

`apps/web/src/components/dashboard/MonthlyDashboardView.tsx`:

```tsx
import type { ComponentProps } from 'react';
import { VariableExpenseReminderBanner } from '@/components/dashboard/VariableExpenseReminderBanner';
import { IncomeReminderBanner } from '@/components/dashboard/IncomeReminderBanner';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MonthlyCategoryBreakdown } from '@/components/dashboard/MonthlyCategoryBreakdown';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';

interface MonthlyDashboardViewProps {
  variableReminders: ComponentProps<typeof VariableExpenseReminderBanner>['reminders'];
  incomeReminders: ComponentProps<typeof IncomeReminderBanner>['reminders'];
  members: ComponentProps<typeof VariableExpenseReminderBanner>['members'];
  onRegisterReminder: ComponentProps<typeof VariableExpenseReminderBanner>['onRegister'];
  onDismissReminder: ComponentProps<typeof VariableExpenseReminderBanner>['onDismiss'];
  onRegisterIncomeReminder: ComponentProps<typeof IncomeReminderBanner>['onRegister'];
  onDismissIncomeReminder: ComponentProps<typeof IncomeReminderBanner>['onDismiss'];
  summary: ComponentProps<typeof SummaryCards>['summary'];
  summaryLoading: boolean;
  transactions: ComponentProps<typeof RecentTransactions>['transactions'];
  transactionsLoading: boolean;
  balances: ComponentProps<typeof BalanceCard>['balances'];
  balanceHighlights: ComponentProps<typeof BalanceCard>['highlights'];
  balancesLoading: boolean;
  currentUserId: ComponentProps<typeof BalanceCard>['currentUserId'];
  onSelectSettlementTarget: ComponentProps<typeof BalanceCard>['onSelectSettlementTarget'];
  onEditTransaction: ComponentProps<typeof RecentTransactions>['onEdit'];
  onDeleteTransaction: ComponentProps<typeof RecentTransactions>['onDelete'];
}

export function MonthlyDashboardView(props: MonthlyDashboardViewProps) {
  return (
    <>
      <VariableExpenseReminderBanner
        reminders={props.variableReminders}
        members={props.members}
        onRegister={props.onRegisterReminder}
        onDismiss={props.onDismissReminder}
      />
      <IncomeReminderBanner
        reminders={props.incomeReminders}
        members={props.members}
        onRegister={props.onRegisterIncomeReminder}
        onDismiss={props.onDismissIncomeReminder}
      />
      <SummaryCards
        summary={props.summary}
        isLoading={props.summaryLoading || props.transactionsLoading}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MonthlyCategoryBreakdown
          transactions={props.transactions}
          isLoading={props.transactionsLoading}
          onEdit={props.onEditTransaction}
          onDelete={props.onDeleteTransaction}
        />
        <BalanceCard
          balances={props.balances}
          currentUserId={props.currentUserId}
          isLoading={props.balancesLoading}
          highlights={props.balanceHighlights}
          onSelectSettlementTarget={props.onSelectSettlementTarget}
        />
      </div>
      <RecentTransactions
        transactions={props.transactions}
        isLoading={props.transactionsLoading}
        onEdit={props.onEditTransaction}
        onDelete={props.onDeleteTransaction}
      />
    </>
  );
}
```

> 確認済（現行 page.tsx L574-615）：TabsContent は `className="space-y-6"`、SummaryCards は `isLoading={summaryLoading || transactionsLoading}`、grid は `gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`、BalanceCard の currentUserId は `user?.id`。上のコードはこれに一致済み。**フラグメントを返し spacing は TabsContent 側に残す**（二重ラップ回避）。banner は「reminders が空なら null を返す」設計のため現行どおり動く。

- [ ] **Step 2: page.tsx で差し替え**

月次 `TabsContent` の中身を `<MonthlyDashboardView ... />` 一行に置き換え、page.tsx が保持する state/handler（`variableReminders`, `incomeReminders`, `members`, `summary`, `summaryLoading`, `transactions`, `transactionsLoading`, `balances`, `balanceHighlights`, `balancesLoading`, `user?.id`, `handleRegisterFromReminder`, `dismissReminder`, `handleRegisterFromIncomeReminder`, `dismissIncomeReminder`, `handleEditTransaction`, `handleDeleteTransaction`, `openSettlementModal`）を props に渡す。実際の変数名は現行 page.tsx を参照して正確に対応付ける。

- [ ] **Step 3: ビルド・lint・目視確認**

Run: `pnpm --filter web build && pnpm --filter web lint`
Expected: 成功。月次タブ（バナー・サマリー・カテゴリ内訳・残高・最近の取引）が従来と完全に同一に表示・動作する（編集/削除/精算/リマインダー登録まで）。

- [ ] **Step 4: コミット**

```bash
git add apps/web/src/components/dashboard/MonthlyDashboardView.tsx apps/web/src/app/page.tsx
git commit -m "refactor: 月次タブを MonthlyDashboardView に抽出し page.tsx を軽量化"
```

---

## 全体検証（Group 完了ごと／最終）

- [ ] **テスト**: `pnpm --filter web test`
  Expected: calculator・transaction(zod) を含む全テスト PASS。
  （メモリ逼迫時に Vitest ワーカー起動がタイムアウトすることがある＝コードの問題ではない。再実行で確認。）
- [ ] **Lint**: `pnpm --filter web lint` → エラーなし。
- [ ] **ビルド**: `pnpm --filter web build` → 成功。
- [ ] **マイグレーション**: `supabase db push --config supabase/config.toml --dry-run` → 009 が想定どおり。
- [ ] **手動 E2E（dev）**:
  1. フォント＝丸ゴシック、主要ボタン＝藍、収入=みどり/支出=珊瑚 を目視。
  2. 取引登録：電卓で `1200 ＋ 800` →「金額に入れる」→ 2000 で保存。
  3. 支出に場所「スーパー」を保存 → 再オープンで候補表示／収入タブでは場所欄が出ない。
  4. 各タブ（月次/年次/定期支出/定期収入）が分割後も従来通り動作（編集・削除・精算・リマインダー登録）。

---

## Self-Review メモ（作成者チェック済み）

- **Spec coverage**: DESIGN.md の ①トークン(§7-1,7-2)=Task1 / ②フォント(§7-3)=Task2 / ③かんたん電卓(§6)=Task3-6 / ④場所フィールド=Task7-11 / ⑤page.tsx分割=Task12-14。全要件にタスク対応あり。
- **型整合**: `place` をフォーム(`place`)→zod(`place`)→`TransactionData.place`→DB列(`place`)→`get_place_suggestions` まで同名で一貫。電卓 API（`inputDigit`/`pressPlus`/`backspace`/`clearCalc`/`calcTotal`/`formatCalcTape`/`CalcState`/`initialCalcState`）はテスト・実装・UI で一致。
- **No placeholders**: 新規ファイルは完全コード。page.tsx 分割は「既存 JSX の移動＋props 契約」を明示（行範囲つき）。
- **前提**: `setValue`・`householdId`(prop)・`watch('type')`・`toTransactionData`(validations 側) は実コードで確認済み。
- **Codex レビュー反映済み**: ①service の `createClient()` は関数内呼び出し ②電卓桁上限を 10 桁（NUMERIC(12,2)）に ③`place` は収入で null 固定（タブ残留防止）④`@theme` に income-soft/expense-soft 追加 ⑤月次/年次抽出は現行 class に一致（gap-6 lg:grid-cols-[...]、`summaryLoading || transactionsLoading`、フラグメント返し）⑥フォント fallback 追加＋Web フォント実機検証 ⑦migration に place 50 文字 CHECK ⑧Next 15/React 19/zod 4 へ前提更新 ⑨rpc は `(supabase as any)` で型回避。
