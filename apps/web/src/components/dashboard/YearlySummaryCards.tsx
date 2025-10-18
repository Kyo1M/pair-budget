/**
 * 年次サマリーカード
 */

'use client';

import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { YearlySummary } from '@/store/useYearlyDashboardStore';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

interface YearlySummaryCardsProps {
  summary: YearlySummary | null;
  isLoading: boolean;
}

export function YearlySummaryCards({ summary, isLoading }: YearlySummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-dashed">
            <CardHeader>
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const income = summary?.incomeTotal ?? 0;
  const expense = summary?.expenseTotal ?? 0;
  const balance = summary?.balance ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-emerald-100 bg-emerald-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-emerald-700">年間収入合計</CardTitle>
          <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-700">
            {currencyFormatter.format(income)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-rose-100 bg-rose-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-rose-700">年間支出合計</CardTitle>
          <ArrowDownCircle className="h-5 w-5 text-rose-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-rose-700">
            {currencyFormatter.format(expense)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-blue-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">年間差額</CardTitle>
          <Wallet className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-blue-900'}`}>
            {currencyFormatter.format(balance)}
          </p>
          <p className="mt-1 text-xs text-blue-600">年間の収支差額です</p>
        </CardContent>
      </Card>
    </div>
  );
}
