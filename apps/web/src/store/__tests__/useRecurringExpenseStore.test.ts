import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissVariableExpenseReminder } from '@/services/recurringExpenses';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import type { RecurringExpense, VariableExpenseReminder } from '@/types/transaction';

vi.mock('@/services/recurringExpenses', () => ({
  listRecurringExpenses: vi.fn(),
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn().mockResolvedValue(undefined),
  generateMissingTransactions: vi.fn(),
  generateFixedTransactionsByDate: vi.fn(),
  getVariableExpenseReminders: vi.fn(),
  dismissVariableExpenseReminder: vi.fn().mockResolvedValue(undefined),
}));

function makeExpense(id: string): RecurringExpense {
  return {
    id,
    householdId: 'hh-1',
    amount: 12000,
    dayOfMonth: 20,
    category: 'other',
    note: null,
    payerUserId: 'user-1',
    isActive: true,
    expenseType: 'variable',
    createdBy: 'user-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };
}

function makeReminder(id: string): VariableExpenseReminder {
  return {
    id,
    amount: 12000,
    dayOfMonth: 20,
    category: 'other',
    note: null,
    payerUserId: 'user-1',
  };
}

describe('useRecurringExpenseStore reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRecurringExpenseStore.getState().reset();
  });

  it('DBへの月次非表示保存後にバナーから除去する', async () => {
    useRecurringExpenseStore.setState({ variableReminders: [makeReminder('expense-1')] });

    await useRecurringExpenseStore.getState().dismissReminder('expense-1');

    expect(dismissVariableExpenseReminder).toHaveBeenCalledWith('expense-1');
    expect(useRecurringExpenseStore.getState().variableReminders).toEqual([]);
  });

  it('定期支出を削除したら対応するバナーも除去する', async () => {
    useRecurringExpenseStore.setState({
      recurringExpenses: [makeExpense('expense-1')],
      variableReminders: [makeReminder('expense-1')],
    });

    await useRecurringExpenseStore.getState().removeRecurringExpense('expense-1');

    expect(useRecurringExpenseStore.getState().recurringExpenses).toEqual([]);
    expect(useRecurringExpenseStore.getState().variableReminders).toEqual([]);
  });
});
