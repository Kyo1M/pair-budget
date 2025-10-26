/**
 * 年次差額棒グラフ
 */

'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyDifference } from '@/store/useYearlyDashboardStore';
import type { TooltipContentProps } from 'recharts';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

type YearlyMetric = 'balance' | 'income' | 'expense';

interface YearlyBalanceChartProps {
  data: MonthlyDifference[];
  isLoading: boolean;
  defaultMetric?: YearlyMetric;
}

interface TooltipPayload {
  label: string;
  value: number;
  cumulative: number;
}

function isTooltipPayload(data: unknown): data is TooltipPayload {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.label === 'string' &&
    typeof candidate.value === 'number' &&
    typeof candidate.cumulative === 'number'
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!isTooltipPayload(item)) {
    return null;
  }

  return (
    <div className="rounded border bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-gray-700">{item.label}</p>
      <p className={`text-xs ${item.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        月次: {currencyFormatter.format(item.value)}
      </p>
      <p className="text-xs text-blue-600">
        累計: {currencyFormatter.format(item.cumulative)}
      </p>
    </div>
  );
}

const METRIC_OPTIONS: Array<{ value: YearlyMetric; label: string }> = [
  { value: 'balance', label: '差額' },
  { value: 'income', label: '収入' },
  { value: 'expense', label: '支出' },
];

function getBarColor(metric: YearlyMetric, value: number): string {
  if (metric === 'income') {
    return 'var(--chart-1)';
  }
  if (metric === 'expense') {
    return 'var(--chart-4)';
  }
  return value >= 0 ? 'var(--chart-1)' : 'var(--chart-4)';
}

function getBarLabel(metric: YearlyMetric): string {
  switch (metric) {
    case 'income':
      return '月次収入';
    case 'expense':
      return '月次支出';
    case 'balance':
    default:
      return '月次差額';
  }
}

export function YearlyBalanceChart({ data, isLoading, defaultMetric = 'balance' }: YearlyBalanceChartProps) {
  const [metric, setMetric] = useState<YearlyMetric>(defaultMetric);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return data.map((item) => {
      const value =
        metric === 'income'
          ? item.incomeTotal
          : metric === 'expense'
            ? item.expenseTotal
            : item.balance;

      cumulative += value;

      return {
        month: item.month,
        label: `${item.month}月`,
        value,
        cumulative,
      } satisfies TooltipPayload & { month: number };
    });
  }, [data, metric]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>月次差額の推移</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full animate-pulse rounded-lg bg-gray-100" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>月次推移</CardTitle>
          <div className="flex items-center gap-2">
            {METRIC_OPTIONS.map((option) => {
              const isActive = metric === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-600'
                  }`}
                  onClick={() => setMetric(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(value) => `${value}月`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${value / 10000}万`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip<number, string>
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ fill: 'rgba(59,130,246,0.1)' }}
            />
            <Bar dataKey="value" name={getBarLabel(metric)} radius={[4, 4, 0, 0]}>
              {chartData.map((item) => (
                <Cell key={`cell-${item.month}`} fill={getBarColor(metric, item.value)} />
              ))}
            </Bar>
            <Line
              type="stepAfter"
              dataKey="cumulative"
              stroke="var(--chart-5)"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="累計"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
