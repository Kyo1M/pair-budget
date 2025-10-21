/**
 * 月次カテゴリ内訳チャート
 *
 * 支出カテゴリごとの割合を円グラフで表示します。
 */

'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXPENSE_CATEGORY_CHART_COLORS } from '@/constants/categories';
import { calculateExpenseCategoryBreakdown } from '@/lib/dashboard';
import type { Transaction } from '@/types/transaction';

/**
 * 金額フォーマッター
 */
const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

/**
 * パーセントフォーマッター
 */
function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 1000) / 10}%`;
}

/**
 * チャートのツールチップ
 */
type BreakdownTooltipPayload = {
  label: string;
  amount: number;
  ratio: number;
  value: number;
};

function isBreakdownTooltipPayload(data: unknown): data is BreakdownTooltipPayload {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.label === 'string' &&
    typeof candidate.amount === 'number' &&
    typeof candidate.ratio === 'number' &&
    typeof candidate.value === 'number'
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;

  if (!isBreakdownTooltipPayload(data)) {
    return null;
  }

  return (
    <div className="rounded border bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-gray-700">{data.label}</p>
      <p className="text-gray-500">{currencyFormatter.format(data.amount)}</p>
      <p className="text-xs text-gray-400">{formatPercent(data.ratio)}</p>
    </div>
  );
}

/**
 * スケルトン表示
 */
function BreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>カテゴリ内訳</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center">
          <div className="h-40 w-40 rounded-full border border-dashed border-gray-200">
            <div className="h-full w-full animate-pulse rounded-full bg-gray-100" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 月次カテゴリ内訳チャート
 */
export function MonthlyCategoryBreakdown({
  transactions,
  isLoading,
}: {
  transactions: Transaction[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <BreakdownSkeleton />;
  }

  const { items, total } = calculateExpenseCategoryBreakdown(transactions);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>カテゴリ内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">この月の支出データがまだありません</p>
            <p className="mt-1 text-xs text-gray-400">
              世帯向け立替は支出として計上し、個別の立替は内訳に含めていません。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData: Array<BreakdownTooltipPayload & { name: string; color: string }> = items.map((item) => ({
    name: item.category.label,
    label: item.category.label,
    value: item.amount,
    amount: item.amount,
    ratio: item.ratio,
    color: EXPENSE_CATEGORY_CHART_COLORS[item.key],
  }));

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>カテゴリ内訳</CardTitle>
        <p className="text-xs text-gray-500">
          合計 {currencyFormatter.format(total)} ・世帯向け立替は含まれ、個別立替は除外しています
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[minmax(0,1fr)] lg:grid-cols-[60%_1fr]">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={2}
              >
                {chartData.map((item) => (
                  <Cell key={item.name} fill={item.color} stroke="white" strokeWidth={1} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="space-y-3">
          {chartData.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-400">{formatPercent(item.ratio)}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {currencyFormatter.format(item.amount)}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
