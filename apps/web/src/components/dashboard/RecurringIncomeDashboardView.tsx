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
