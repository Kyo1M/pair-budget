# DESIGN.md — PairBudget デザインシステム

PairBudget（ふたりの財布）の見た目の基準書。配色・タイポ・コンポーネントの「単一の真実」。
UI を作る・直すときは本書のトークンに従う（CLAUDE.md と並ぶ参照ドキュメント）。

- **対象**: 2人世帯向けの家計管理アプリ
- **モード**: ライトモードのみ（ダークは Phase 4 以降）
- **スタック**: Next.js 14 App Router / Tailwind v4（`@theme`、JS config なし）/ shadcn/ui (new-york) / lucide-react
- **更新日**: 2026-06-03 / バージョン: v1（Phase 3 策定）

---

## 1. デザイン原則

1. **静かに** — 絵文字は使わない。色と余白で情報を整理し、装飾は最小限。
2. **親しみやすく** — 丸ゴシック ＋ やわらかな角丸 ＋ 淡い影。
3. **迷わせない** — **収入 = みどり / 支出 = 珊瑚** を全画面で一貫させる。
4. **記録が億劫にならない** — 入力は最短手数。電卓などの補助はさりげなく添える。

---

## 2. カラートークン

設計上の真実は下記の HEX。実装では CSS 変数として `:root` に定義する（§7）。

### ブランド / 操作

| 役割 | 変数 | 値 |
|---|---|---|
| プライマリ（操作・ブランド） | `--pb-primary` | `#5B6CF0` |
| プライマリ hover | `--pb-primary-hover` | `#4A57D6` |
| プライマリ active | `--pb-primary-active` | `#3C49B8` |
| プライマリ淡（背景） | `--pb-primary-soft` | `#E7E9FE` |
| プライマリ上の文字 | `--pb-on-primary` | `#FFFFFF` |

### 収支セマンティック（最重要・一貫させる）

| 役割 | 変数 | 値 |
|---|---|---|
| 収入 / プラス | `--pb-income` | `#23A082` |
| 収入 淡 | `--pb-income-soft` | `#DCF3EC` |
| 支出 / マイナス | `--pb-expense` | `#F2566B` |
| 支出 淡 | `--pb-expense-soft` | `#FFE9EC` |

### アクセント / 状態

| 役割 | 変数 | 値 |
|---|---|---|
| アクセント（珊瑚） | `--pb-coral` | `#FF7A8A` |
| アクセント（やまぶき）／立替・要精算 | `--pb-amber` | `#FFC857` |
| やまぶき濃 | `--pb-amber-deep` | `#E8A93C` |
| やまぶき淡 | `--pb-amber-soft` | `#FFF1D6` |
| 破壊的操作（削除など） | `--pb-danger` | `#E5484D` |

> **注**: 削除＝`--pb-danger`（やや赤）で、支出色 `--pb-expense`（珊瑚）と**意味を区別する**。「支出＝エラー」に見せない。

### ニュートラル

| 役割 | 変数 | 値 |
|---|---|---|
| アプリ背景（ほのかに藍がかった白） | `--pb-bg` | `#FBFAFF` |
| 面（カード・モーダル） | `--pb-surface` | `#FFFFFF` |
| 枠線 / 区切り | `--pb-border` | `#ECECF3` |
| 文字・濃（ink） | `--pb-ink` | `#2A2A40` |
| 文字・中（muted） | `--pb-muted` | `#6E6E85` |
| 文字・淡（faint） | `--pb-faint` | `#9A9AB0` |

### チャート（カテゴリ別グラフ）

カテゴリバー／円グラフはブランドパレットを循環使用：
`--pb-primary` → `--pb-coral` → `--pb-amber` → `--pb-income` → `--pb-primary-active` …

### 分析ダッシュボードの配色

- 分析画面は読み取りやすさを優先し、金額・収支・差額を濃い文字色、カードを白にする。通常支出のカード全面やグラフを赤くしない。
- グラフの主系列は控えめな藍色、比較する前月の系列はニュートラル。線・棒・凡例で共通の配色にする。藍色はここではデータ系列の識別に使い、収入を意味しない。
- 支出の前月差は、増加＝珊瑚、減少＝みどりの小さな補助マーカーに留める。金額は濃い文字色のまま、符号や「支出増／支出減」でも意味を伝える。
- ボタンや選択状態もブランドの藍色を使用する。非操作の見出しアイコンはニュートラルにする。
- 複数カテゴリの構成比を色分けするチャートと異なり、カテゴリごとの対象月／前月比較では全カテゴリで共通の系列色を使う。

---

## 3. タイポグラフィ

- **フォント**: **M PLUS Rounded 1c**（`next/font/google`）。fallback: `"Hiragino Maru Gothic ProN", "Hiragino Sans", system-ui, sans-serif`
  - 現状の Geist は日本語サブセットを持たないため置き換える。
- **金額には** `tabular-nums`（等幅数字）を付け、桁を揃える。

| 用途 | サイズ | ウェイト |
|---|---|---|
| 金額・大表示 | 26–30px | 800 |
| 画面見出し (h2) | 20px | 800 |
| セクション見出し (h3) | 15–16px | 800 |
| 本文 | 14px | 400–500 |
| ラベル | 11.5–12px | 600（`--pb-muted`） |
| キャプション | 11px | 400（`--pb-faint`） |

---

## 4. 形・奥行き・余白

### 角丸（radius）

| トークン | 値 | 用途 |
|---|---|---|
| `--pb-radius-sm` | 10px | キー・小要素 |
| `--pb-radius-md` | 13px | 入力欄・ボタン（shadcn `--radius` の基準） |
| `--pb-radius-lg` | 18px | カード |
| `--pb-radius-xl` | 24px | モーダル・ボトムシート |
| pill | 9999px | チップ・タグ |

### 影（shadow）

| トークン | 値 |
|---|---|
| `--pb-shadow-sm` | `0 2px 6px rgba(40,40,80,.06)` |
| `--pb-shadow-md` | `0 6px 20px rgba(40,40,80,.06)` |
| `--pb-shadow-lg` | `0 10px 34px rgba(40,40,80,.10)` |
| `--pb-shadow-primary` | `0 6px 16px rgba(91,108,240,.30)`（プライマリボタン） |

### 余白

4px グリッド：`4 / 8 / 12 / 16 / 20 / 24 / 32`。Tailwind の `1 2 3 4 5 6 8` に対応。

---

## 5. アイコン & 挿絵

### アイコン

- **絵文字は使わない。**
- テキスト優先。アイコンは「機能上あると分かりやすい箇所」だけ（電卓ボタン、ナビ等）。
- **lucide-react**、stroke ≈ 1.75、サイズ 16–20px、色は `currentColor`（単色）。
- カテゴリ選択チップは**テキストのみ**（アイコンなし）。

### 挿絵（イラスト）

- **作風: 細い輪郭線 ＋ 淡い塗りのアイソメトリック。** 確定パレットで配色を統一。
- にぎやかにしない。画面を埋めず、余白に小さく置く。
- **配置箇所**: 空状態（まだ記録が無い）／世帯作成／ログイン・サインアップ／精算完了。
- **作成**: 画像はオーナーが別途作成。本書は作風ガイド。形式は **SVG 推奨**（無ければ 2x PNG）。
- **配置先**: `apps/web/public/illustrations/`、ファイル名はケバブケース（例: `empty-transactions.svg`）。

---

## 6. コンポーネント指針

| コンポーネント | 指針 |
|---|---|
| **プライマリボタン** | 背景 `--pb-primary`、文字 `--pb-on-primary`、`--pb-radius-md`、`--pb-shadow-primary`。hover で `--pb-primary-hover`。 |
| **ゴーストボタン** | 背景 `--pb-primary-soft`、文字 `--pb-primary-hover`。 |
| **危険ボタン（削除）** | `--pb-danger`。確認を挟む。 |
| **カテゴリ選択** | テキストのみの pill。未選択＝`--pb-primary-soft`／文字 `--pb-primary-hover`、選択＝`--pb-primary` ベタ／白文字。 |
| **入力欄** | 白地 ＋ `inset 0 0 0 1.5px --pb-border`、`--pb-radius-md`。focus で `--pb-primary` の 2px リング（shadcn `--ring`）。 |
| **かんたん電卓** | 金額欄の**右に単色アイコンボタン**。押すと**ポップオーバー**で足し算（`1,200 ＋ 800 …`）→「金額に入れる」で金額欄へ反映。フル電卓にはしない（足し算中心、⌫・クリアのみ）。 |
| **金額表示** | 収入＝`--pb-income`／支出＝`--pb-expense`、800 太字、`tabular-nums`。 |
| **カード / サマリー** | `--pb-surface` ＋ `--pb-radius-lg` ＋ `--pb-shadow-md`。**現行レイアウトは維持**し、配色トークンのみ差し替える。 |
| **モーダル / ボトムシート** | `--pb-radius-xl`、`--pb-shadow-lg`、背景 `--pb-bg`。 |

---

## 7. 実装ガイド（実装直結）

このリポジトリは **Tailwind v4**（`apps/web/src/app/globals.css` の `@theme` で構成、JS config なし）＋ shadcn/ui（CSS 変数 = oklch）。
適用は次の3点で行う。

### 7-1. `globals.css` にブランドトークンを追加

`:root` に PairBudget トークンを追加する（値は HEX で可。oklch 統一したい場合は変換しても良い）。

```css
:root {
  /* === PairBudget brand tokens === */
  --pb-primary: #5b6cf0;
  --pb-primary-hover: #4a57d6;
  --pb-primary-active: #3c49b8;
  --pb-primary-soft: #e7e9fe;
  --pb-on-primary: #ffffff;

  --pb-income: #23a082;       --pb-income-soft: #dcf3ec;
  --pb-expense: #f2566b;      --pb-expense-soft: #ffe9ec;

  --pb-coral: #ff7a8a;
  --pb-amber: #ffc857;        --pb-amber-deep: #e8a93c;  --pb-amber-soft: #fff1d6;
  --pb-danger: #e5484d;

  --pb-bg: #fbfaff;
  --pb-surface: #ffffff;
  --pb-border: #ececf3;
  --pb-ink: #2a2a40;
  --pb-muted: #6e6e85;
  --pb-faint: #9a9ab0;

  --pb-radius-sm: 10px;  --pb-radius-md: 13px;  --pb-radius-lg: 18px;  --pb-radius-xl: 24px;
  --pb-shadow-sm: 0 2px 6px rgba(40,40,80,.06);
  --pb-shadow-md: 0 6px 20px rgba(40,40,80,.06);
  --pb-shadow-lg: 0 10px 34px rgba(40,40,80,.10);
  --pb-shadow-primary: 0 6px 16px rgba(91,108,240,.30);
}
```

### 7-2. shadcn セマンティック変数をブランドへマッピング

既存の shadcn コンポーネント（Button, Card, Input…）が自動でブランド色を拾うよう、`:root` の既定（neutral/oklch）を上書きする：

```css
:root {
  --radius: 0.8125rem;               /* 13px = --pb-radius-md */
  --background: var(--pb-bg);
  --foreground: var(--pb-ink);
  --card: var(--pb-surface);         --card-foreground: var(--pb-ink);
  --popover: var(--pb-surface);      --popover-foreground: var(--pb-ink);
  --primary: var(--pb-primary);      --primary-foreground: var(--pb-on-primary);
  --secondary: var(--pb-primary-soft); --secondary-foreground: var(--pb-primary-hover);
  --muted: #f2f1fa;                  --muted-foreground: var(--pb-muted);
  --accent: var(--pb-primary-soft);  --accent-foreground: var(--pb-primary-hover);
  --destructive: var(--pb-danger);
  --border: var(--pb-border);        --input: var(--pb-border);
  --ring: var(--pb-primary);
}
```

さらに Tailwind ユーティリティ（`bg-pb-income` 等）を生やすため `@theme inline` に追加：

```css
@theme inline {
  --color-pb-primary: var(--pb-primary);
  --color-pb-primary-soft: var(--pb-primary-soft);
  --color-pb-income: var(--pb-income);
  --color-pb-expense: var(--pb-expense);
  --color-pb-coral: var(--pb-coral);
  --color-pb-amber: var(--pb-amber);
  --color-pb-danger: var(--pb-danger);
  --color-pb-bg: var(--pb-bg);
  --color-pb-surface: var(--pb-surface);
  --color-pb-ink: var(--pb-ink);
  --color-pb-muted: var(--pb-muted);
  --color-pb-faint: var(--pb-faint);
  --font-sans: var(--font-rounded);   /* §7-3 のフォントに切替 */
}
```

### 7-3. フォントを M PLUS Rounded 1c へ

`apps/web/src/app/layout.tsx`：

```tsx
import { M_PLUS_Rounded_1c, Geist_Mono } from "next/font/google";

const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],     // 日本語グリフは大きいため
  display: "swap",
  preload: false,         // 巨大プリロードを避ける
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// <body className={`${rounded.variable} ${geistMono.variable} antialiased`}>
```

`@theme inline` の `--font-sans` を（既存の `var(--font-geist-sans)` から）`var(--font-rounded)` に向ける（§7-2）。

> **要検証**: M PLUS Rounded 1c は日本語を含む大きなフォント。`next/font` の `subsets` 指定では日本語グリフが落ちる場合があるため、**実機で日本語表示を必ず確認**する。問題が出たら self-host（`next/font/local`）か `<link>` 読み込みへ切替を検討。

### 7-4. Phase 3 で適用する範囲

- **やる**: §7-1〜7-3 のトークン／フォント基盤導入。**入力体験まわり**（取引追加・編集フォーム＝かんたん電卓・カテゴリチップ・新規の「場所」フィールド）への適用。`page.tsx` 分割時に触る箇所は機会的にトークン化。
- **やらない（Phase 4 送り）**: ダッシュボード／精算／世帯画面の全面再スキン、ダークモード、a11y 全面対応、週次ヒートマップ等のリッチ可視化。

---

## 8. スコープ外（Phase 4 以降）

ダークモード、ダッシュボードの本格再構成、アクセシビリティ全面対応、リッチな可視化、カテゴリの DB 化・編集可能化。

---

## 9. 変更履歴

- **v1 (2026-06-03)**: Phase 3 で新規策定。配色（藍×珊瑚×やまぶき＋収入みどり）、丸ゴシック、テキスト優先アイコン、輪郭線アイソメトリック挿絵、かんたん電卓を確定。
