"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  Wallet,
  ChartColumn,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpendingPaceChart } from "@/components/dashboard/SpendingPaceChart";
import { ReceiptImageButton } from "@/components/receipts/ReceiptImageButton";
import {
  formatAnalyticsMonth,
  type DashboardAnalysis,
  type PaceMode,
} from "@/lib/analytics";
import {
  getExpenseBreakdownCategory,
  getExpenseBreakdownKey,
  type ExpenseBreakdownKey,
} from "@/lib/dashboard";
import type { Transaction } from "@/types/transaction";
import type { HouseholdMember } from "@/types/household";

const panelClass =
  "gap-5 rounded-[var(--pb-radius-lg)] border-border py-5 text-pb-ink shadow-[var(--pb-shadow-md)] sm:py-6";
const money = (value: number) => `¥${value.toLocaleString("ja-JP")}`;
const signed = (value: number) =>
  `${value < 0 ? "−" : "+"}${money(Math.abs(value))}`;

interface Props {
  analysis: DashboardAnalysis;
  members: HouseholdMember[];
  onMonthChange: (month: string) => void;
  paceMode: PaceMode;
  onPaceModeChange: (mode: PaceMode) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<void>;
}

export function AnalyticsDashboardView({
  analysis,
  members,
  onMonthChange,
  paceMode,
  onPaceModeChange,
  onEdit,
  onDelete,
}: Props) {
  const [sort, setSort] = useState("difference");
  const [category, setCategory] = useState<ExpenseBreakdownKey | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { period } = analysis;
  const comparisons = [...analysis.categories].sort((a, b) =>
    sort === "amount" ? b.amount - a.amount : b.difference - a.difference,
  );
  const selectedCategory = comparisons.find((item) => item.key === category);
  const detail = analysis.expenses.filter(
    (t) => getExpenseBreakdownKey(t) === category,
  );
  const maxMonth = Math.max(1, ...analysis.monthly.map((m) => m.amount ?? 0));
  const maxCategory = Math.max(
    1,
    ...comparisons.flatMap((c) => [c.amount, c.previousAmount]),
  );
  const comparisonLabel = period.isFuture
    ? "比較対象外"
    : period.isCurrent
      ? `${Number(period.previousMonth.slice(5))}/1〜${period.previousDays}（前月同日まで）`
      : `${formatAnalyticsMonth(period.previousMonth)}全期間`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 rounded-[var(--pb-radius-lg)] border-border bg-white py-5 shadow-[var(--pb-shadow-sm)] sm:col-span-1">
          <CardContent className="px-5">
            <p className="flex items-center justify-between text-sm font-bold text-pb-ink">
              家計の支出
              <ArrowDownCircle
                className="h-5 w-5 text-pb-muted"
                strokeWidth={1.75}
              />
            </p>
            <p className="my-2 text-[28px] font-extrabold tracking-tight tabular-nums text-pb-ink">
              {period.isFuture ? "—" : money(analysis.summary.expenseTotal)}
            </p>
            <p className="text-xs text-pb-muted">
              {period.isCurrent
                ? `${Number(period.month.slice(5))}/1〜${period.elapsedDays}の記録`
                : "世帯向け立替を含む"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[var(--pb-radius-lg)] border-border bg-white py-5 shadow-[var(--pb-shadow-sm)]">
          <CardContent className="px-3 sm:px-5">
            <p className="flex items-center justify-between text-xs font-bold text-pb-ink sm:text-sm">
              前月との差額
              <ArrowLeftRight
                className="h-5 w-5 text-pb-muted"
                strokeWidth={1.75}
              />
            </p>
            <p className="my-2 text-xl font-extrabold tracking-tight tabular-nums text-pb-ink sm:text-[28px]">
              {period.isFuture ? "—" : signed(analysis.difference)}
            </p>
            <p className="text-xs text-pb-muted">{comparisonLabel}</p>
            <p className="mt-1 text-xs text-pb-muted">
              {!period.isFuture && analysis.difference !== 0 && (
                <span className="mr-2 inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${analysis.difference > 0 ? "bg-pb-expense" : "bg-pb-income"}`}
                  />
                  {analysis.difference > 0 ? "支出増" : "支出減"}
                </span>
              )}
              {analysis.differenceRatio === null
                ? "増減率 —（前月の支出は0円）"
                : `${analysis.differenceRatio >= 0 ? "+" : ""}${(analysis.differenceRatio * 100).toFixed(1)}%`}
              {!analysis.hasPreviousRecords && !period.isFuture
                ? "・前月の比較期間に記録なし"
                : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[var(--pb-radius-lg)] border-border bg-white py-5 shadow-[var(--pb-shadow-sm)]">
          <CardContent className="px-3 sm:px-5">
            <p className="flex items-center justify-between text-xs font-bold text-pb-ink sm:text-sm">
              記録上の収支
              <Wallet className="h-5 w-5 text-pb-muted" strokeWidth={1.75} />
            </p>
            <p className="my-2 break-all text-xl font-extrabold tracking-tight tabular-nums text-pb-ink sm:text-[28px]">
              {period.isFuture ? "—" : signed(analysis.summary.balance)}
            </p>
            <p className="text-xs text-pb-muted">
              記録済み収入 {money(analysis.summary.incomeTotal)} − 家計の支出
            </p>
          </CardContent>
        </Card>
      </div>
      <SpendingPaceChart
        analysis={analysis}
        mode={paceMode}
        onModeChange={onPaceModeChange}
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className={panelClass}>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2.5 text-base font-extrabold">
              <span className="rounded-xl bg-pb-bg p-2 text-pb-muted">
                <ChartColumn className="h-5 w-5" strokeWidth={1.75} />
              </span>
              家計支出の月次推移
            </CardTitle>
            <p className="text-xs text-pb-muted">
              {formatAnalyticsMonth(analysis.monthly[0].month)}〜
              {formatAnalyticsMonth(period.month)}・単位：万円
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div
              className="flex h-56 items-end gap-1 sm:gap-3"
              aria-label="直近6か月の家計支出"
            >
              {analysis.monthly.map((item) => (
                <button
                  key={item.month}
                  type="button"
                  aria-pressed={item.month === period.month}
                  aria-label={`${formatAnalyticsMonth(item.month)} ${item.amount === null ? "未到来" : money(item.amount)}${item.partial ? "・今日まで" : ""}`}
                  onClick={() => onMonthChange(item.month)}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-xl px-1 pb-2 text-xs text-pb-muted transition-colors hover:bg-pb-bg"
                >
                  <span
                    className={`tabular-nums ${item.month === period.month ? "font-bold text-pb-ink" : ""}`}
                  >
                    {item.amount === null
                      ? "—"
                      : (item.amount / 10000).toFixed(1)}
                  </span>
                  <span
                    className={`w-5 max-w-full rounded-t-lg sm:w-8 ${item.month === period.month ? "bg-pb-primary/80" : "bg-pb-primary/25"}`}
                    style={{
                      height:
                        item.amount === null
                          ? 0
                          : Math.max(
                              item.amount > 0 ? 2 : 0,
                              (item.amount / maxMonth) * 135,
                            ),
                    }}
                  />
                  <span
                    className={`rounded-full px-2 py-1 ${item.month === period.month ? "bg-pb-primary-soft font-bold text-pb-primary" : ""}`}
                  >
                    {item.label}
                  </span>
                  <span className="min-h-4 whitespace-nowrap text-[9px] sm:text-[11px]">
                    {item.amount === null
                      ? "未到来"
                      : item.partial
                        ? "途中"
                        : !item.hasRecords
                          ? "記録なし"
                          : ""}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-pb-muted">
              月を選ぶと利用ペースとカテゴリ比較も切り替わります
            </p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2.5 text-base font-extrabold">
                <span className="rounded-xl bg-pb-bg p-2 text-pb-muted">
                  <Layers className="h-5 w-5" strokeWidth={1.75} />
                </span>
                カテゴリ別の増減
              </CardTitle>
              <select
                aria-label="カテゴリの並び順"
                className="min-h-11 max-w-full rounded-xl border bg-pb-bg px-3 text-sm font-medium"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="difference">増加額順</option>
                <option value="amount">利用額順</option>
              </select>
            </div>
            <p className="text-xs text-pb-muted">
              <span className="mb-2 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pb-primary/80" />
                  対象月
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pb-faint/50" />
                  前月
                </span>
              </span>
              比較：{comparisonLabel}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {comparisons.length === 0 ? (
              <p className="py-6 text-center text-sm text-pb-muted">
                {period.isFuture
                  ? "まだ到来していない月です"
                  : "比較できる支出の記録はありません"}
              </p>
            ) : (
              <ul className="space-y-2">
                {comparisons.map((item) => {
                  const CategoryIcon = getExpenseBreakdownCategory(
                    item.key,
                  ).icon;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        aria-pressed={category === item.key}
                        className={`group w-full rounded-xl border p-3 text-left transition-colors hover:border-pb-primary/30 hover:bg-pb-bg ${category === item.key ? "border-pb-primary/40 bg-pb-primary-soft/40" : "border-transparent"}`}
                        onClick={() => {
                          setCategory(item.key);
                          setVisibleCount(20);
                        }}
                        aria-label={`${item.label}の明細を見る。対象月${money(item.amount)}、前月${money(item.previousAmount)}`}
                      >
                        <span className="flex flex-wrap justify-between gap-2 text-sm font-medium">
                          <span className="flex items-center gap-2 font-bold">
                            <CategoryIcon
                              className="h-4 w-4 text-pb-muted"
                              strokeWidth={1.75}
                            />
                            {item.label}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs tabular-nums text-pb-muted">
                            {item.difference !== 0 && (
                              <span
                                aria-hidden="true"
                                className={`h-1.5 w-1.5 rounded-full ${item.difference > 0 ? "bg-pb-expense" : "bg-pb-income"}`}
                              />
                            )}
                            {signed(item.difference)}
                            <ChevronRight className="h-4 w-4 text-pb-faint" />
                          </span>
                        </span>
                        <span className="my-2 flex flex-wrap justify-between gap-2 text-xs text-pb-muted">
                          <span>{money(item.amount)}</span>
                          <span>前月 {money(item.previousAmount)}</span>
                        </span>
                        <span
                          className="mb-1 block h-2 rounded-full bg-pb-primary/80"
                          style={{
                            width: `${(item.amount / maxCategory) * 100}%`,
                          }}
                        />
                        <span
                          className="block h-1.5 rounded-full bg-pb-faint/40"
                          style={{
                            width: `${(item.previousAmount / maxCategory) * 100}%`,
                          }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedCategory && (
        <Card
          className={panelClass}
          role="region"
          aria-label={`${selectedCategory.label}の取引明細`}
        >
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{selectedCategory.label}の取引明細</CardTitle>
                <p className="mt-2 text-sm text-pb-muted">
                  {formatAnalyticsMonth(period.month)}
                  {period.isCurrent ? ` ${period.elapsedDays}日まで` : ""}・
                  {detail.length}件・合計 {money(selectedCategory.amount)}
                </p>
              </div>
              <Button variant="outline" onClick={() => setCategory(null)}>
                明細を閉じる
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {detail.length === 0 && (
              <p className="text-sm text-pb-muted">
                対象月の取引はありません。前月の支出のみです。
              </p>
            )}
            <ul className="divide-y">
              {detail.slice(0, visibleCount).map((transaction) => {
                const payer = members.find(
                  (member) => member.userId === transaction.payerUserId,
                );
                return (
                  <li
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="break-words text-sm font-medium">
                        {transaction.place ||
                          transaction.note ||
                          selectedCategory.label}
                      </p>
                      <p className="mt-1 break-words text-xs text-pb-muted">
                        {transaction.occurredOn}・
                        {payer?.profile?.name ||
                          payer?.profile?.email ||
                          "支払者不明"}
                        ・
                        {transaction.type === "advance"
                          ? "世帯向け立替"
                          : "支出"}
                      </p>
                      {transaction.place && transaction.note && (
                        <p className="mt-1 break-words text-xs text-pb-muted">
                          {transaction.note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {money(transaction.amount)}
                      </span>
                      {transaction.receiptScanId && (
                        <ReceiptImageButton
                          scanId={transaction.receiptScanId}
                          compact
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => onEdit(transaction)}
                      >
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 text-red-600"
                        disabled={deletingId !== null}
                        onClick={async () => {
                          setDeletingId(transaction.id);
                          try {
                            await onDelete(transaction);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                      >
                        {deletingId === transaction.id ? "削除中" : "削除"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {detail.length > visibleCount && (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setVisibleCount((count) => count + 20)}
              >
                さらに20件表示（残り{detail.length - visibleCount}件）
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      <p className="rounded-xl border border-dashed px-4 py-3 text-xs leading-relaxed text-pb-muted">
        家計支出は通常支出と世帯向け立替の合計です。個人向け立替・精算・未登録レシートは含みません。記録上の収支は口座残高ではありません。
      </p>
    </div>
  );
}
