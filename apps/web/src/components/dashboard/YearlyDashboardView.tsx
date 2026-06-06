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
