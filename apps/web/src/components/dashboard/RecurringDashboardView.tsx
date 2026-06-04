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
