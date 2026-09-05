"use client";

import { useState } from "react";
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
  getExpenseBreakdownKey,
  type ExpenseBreakdownKey,
} from "@/lib/dashboard";
import type { Transaction } from "@/types/transaction";
import type { HouseholdMember } from "@/types/household";

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
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">家計の支出</p>
            <p className="my-2 text-2xl font-bold tabular-nums">
              {period.isFuture ? "—" : money(analysis.summary.expenseTotal)}
            </p>
            <p className="text-xs text-gray-500">
              {period.isCurrent
                ? `${Number(period.month.slice(5))}/1〜${period.elapsedDays}の記録`
                : "世帯向け立替を含む"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">前月との差額</p>
            <p className="my-2 text-2xl font-bold tabular-nums">
              {period.isFuture ? "—" : signed(analysis.difference)}
            </p>
            <p className="text-xs text-gray-500">{comparisonLabel}</p>
            <p className="mt-1 text-xs text-gray-500">
              {analysis.differenceRatio === null
                ? "増減率 —（前月の支出は0円）"
                : `${analysis.differenceRatio >= 0 ? "+" : ""}${(analysis.differenceRatio * 100).toFixed(1)}%`}
              {!analysis.hasPreviousRecords && !period.isFuture
                ? "・前月の比較期間に記録なし"
                : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">記録上の収支</p>
            <p className="my-2 text-2xl font-bold tabular-nums">
              {period.isFuture ? "—" : signed(analysis.summary.balance)}
            </p>
            <p className="text-xs text-gray-500">
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
        <Card>
          <CardHeader>
            <CardTitle>家計支出の月次推移</CardTitle>
            <p className="text-xs text-gray-500">
              {formatAnalyticsMonth(analysis.monthly[0].month)}〜
              {formatAnalyticsMonth(period.month)}・単位：万円
            </p>
          </CardHeader>
          <CardContent>
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
                  className={`flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-md px-1 pb-2 text-xs hover:bg-blue-50 ${item.month === period.month ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}
                >
                  <span className="tabular-nums">
                    {item.amount === null
                      ? "—"
                      : (item.amount / 10000).toFixed(1)}
                  </span>
                  <span
                    className={`w-5 max-w-full rounded-t sm:w-8 ${item.month === period.month ? "bg-blue-600" : "bg-slate-300"}`}
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
                  <span>{item.label}</span>
                  <span className="min-h-4 text-[11px]">
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
            <p className="mt-3 text-xs text-gray-500">
              月を選ぶと利用ペースとカテゴリ比較も切り替わります
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>カテゴリ別の増減</CardTitle>
              <select
                aria-label="カテゴリの並び順"
                className="min-h-11 max-w-full rounded-md border bg-white px-2 text-base"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="difference">増加額順</option>
                <option value="amount">利用額順</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">
              青：対象月 ／ グレー：前月・{comparisonLabel}
            </p>
          </CardHeader>
          <CardContent>
            {comparisons.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                {period.isFuture
                  ? "まだ到来していない月です"
                  : "比較できる支出の記録はありません"}
              </p>
            ) : (
              <ul className="space-y-2">
                {comparisons.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      aria-pressed={category === item.key}
                      className={`w-full rounded-lg p-3 text-left hover:bg-gray-50 ${category === item.key ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}
                      onClick={() => {
                        setCategory(item.key);
                        setVisibleCount(20);
                      }}
                      aria-label={`${item.label}の明細を見る。対象月${money(item.amount)}、前月${money(item.previousAmount)}`}
                    >
                      <span className="flex flex-wrap justify-between gap-2 text-sm font-medium">
                        <span>{item.label}</span>
                        <span>{signed(item.difference)} ›</span>
                      </span>
                      <span className="my-2 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                        <span>{money(item.amount)}</span>
                        <span>前月 {money(item.previousAmount)}</span>
                      </span>
                      <span
                        className="mb-1 block h-1.5 rounded bg-blue-600"
                        style={{
                          width: `${(item.amount / maxCategory) * 100}%`,
                        }}
                      />
                      <span
                        className="block h-1.5 rounded bg-slate-300"
                        style={{
                          width: `${(item.previousAmount / maxCategory) * 100}%`,
                        }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedCategory && (
        <Card role="region" aria-label={`${selectedCategory.label}の取引明細`}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{selectedCategory.label}の取引明細</CardTitle>
                <p className="mt-2 text-sm text-gray-500">
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
          <CardContent>
            {detail.length === 0 && (
              <p className="text-sm text-gray-500">
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
                      <p className="mt-1 break-words text-xs text-gray-500">
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
                        <p className="mt-1 break-words text-xs text-gray-500">
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
      <p className="text-xs leading-relaxed text-gray-500">
        家計支出は通常支出と世帯向け立替の合計です。個人向け立替・精算・未登録レシートは含みません。記録上の収支は口座残高ではありません。
      </p>
    </div>
  );
}
