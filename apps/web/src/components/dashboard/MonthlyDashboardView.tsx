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
