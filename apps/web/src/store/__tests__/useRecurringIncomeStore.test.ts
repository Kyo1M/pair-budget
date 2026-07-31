import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecurringIncomeStore } from '@/store/useRecurringIncomeStore';
import type { IncomeReminder, RecurringIncome } from '@/types/transaction';
import { dismissRecurringIncomeReminder } from '@/services/recurringIncomes';

// Supabase に依存するサービス層をモックし、ストアのロジックのみを検証する。
vi.mock('@/services/recurringIncomes', () => ({
  listRecurringIncomes: vi.fn(),
  createRecurringIncome: vi.fn(),
  updateRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn().mockResolvedValue(undefined),
  getIncomeReminders: vi.fn(),
  dismissRecurringIncomeReminder: vi.fn().mockResolvedValue(undefined),
}));

function makeIncome(id: string): RecurringIncome {
  return {
    id,
    householdId: 'hh-1',
    amount: 300000,
    dayOfMonth: 25,
    category: 'salary',
    note: null,
    recipientUserId: 'user-1',
    isActive: true,
    createdBy: 'user-1',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };
}

function makeReminder(id: string): IncomeReminder {
  return {
    id,
    amount: 300000,
    dayOfMonth: 25,
    category: 'salary',
    note: null,
    recipientUserId: 'user-1',
  };
}

describe('useRecurringIncomeStore.removeRecurringIncome', () => {
  beforeEach(() => {
    useRecurringIncomeStore.getState().reset();
  });

  it('削除した定期収入を recurringIncomes と incomeReminders の両方から除去する', async () => {
    // リマインダーの id は定期収入の id と一致する（get_income_reminders が ri.id を返す）
    useRecurringIncomeStore.setState({
      recurringIncomes: [makeIncome('inc-1'), makeIncome('inc-2')],
      incomeReminders: [makeReminder('inc-1'), makeReminder('inc-3')],
    });

    await useRecurringIncomeStore.getState().removeRecurringIncome('inc-1');

    const state = useRecurringIncomeStore.getState();
    expect(state.recurringIncomes.map((income) => income.id)).toEqual(['inc-2']);
    // 削除済み収入のリマインダーがバナーに残らないこと（収入削除バグの原因B）
    expect(state.incomeReminders.map((reminder) => reminder.id)).toEqual(['inc-3']);
    expect(state.isSubmitting).toBe(false);
  });
});

describe('useRecurringIncomeStore.dismissIncomeReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRecurringIncomeStore.getState().reset();
  });

  it('DBへの月次非表示保存後にバナーから除去する', async () => {
    useRecurringIncomeStore.setState({ incomeReminders: [makeReminder('inc-1')] });
    await useRecurringIncomeStore.getState().dismissIncomeReminder('inc-1');
    expect(dismissRecurringIncomeReminder).toHaveBeenCalledWith('inc-1');
    expect(useRecurringIncomeStore.getState().incomeReminders).toEqual([]);
  });
});
