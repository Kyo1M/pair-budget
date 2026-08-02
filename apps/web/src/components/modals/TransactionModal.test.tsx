import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionModal, type TransactionModalSource } from './TransactionModal';
import type { Transaction } from '@/types/transaction';

const mocks = vi.hoisted(() => ({
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: '00000000-0000-4000-8000-000000000001' } }),
}));

vi.mock('@/store/useTransactionStore', () => ({
  useTransactionStore: (selector: (state: unknown) => unknown) =>
    selector({
      addTransaction: mocks.addTransaction,
      updateTransaction: mocks.updateTransaction,
      isSubmitting: false,
    }),
}));

vi.mock('@/services/transactions', () => ({
  getPlaceSuggestions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: vi.fn() }));

const member = {
  id: 'member-1',
  householdId: 'household-1',
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'owner' as const,
  joinedAt: '2026-07-01T00:00:00Z',
  profile: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com', name: '太郎' },
};

function savedTransaction(amount: number): Transaction {
  return {
    id: 'tx-1',
    householdId: 'household-1',
    type: 'expense',
    amount,
    occurredOn: '2026-07-28',
    category: 'groceries',
    note: null,
    payerUserId: member.userId,
    advanceToUserId: null,
    place: null,
    recurringExpenseId: null,
    recurringIncomeId: null,
    receiptScanId: null,
    createdBy: member.userId,
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
  };
}

describe('TransactionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addTransaction.mockImplementation(async (data: { amount: number }) =>
      savedTransaction(data.amount)
    );
  });

  it('入力元が変わると描画前に対応する金額へリセットする', () => {
    const createSource: TransactionModalSource = { kind: 'create', type: 'expense' };
    const { rerender } = render(
      <TransactionModal open onOpenChange={vi.fn()} householdId="household-1" members={[member]} source={createSource} />
    );
    expect(screen.getByLabelText('金額')).toHaveValue('');

    const reminderSource: TransactionModalSource = {
      kind: 'reminder',
      reminderKind: 'expense',
      reminderId: 'reminder-1',
      preset: {
        type: 'expense',
        amount: 8500,
        occurredOn: '2026-07-28',
        category: 'fixed',
        note: '電気代',
        payerUserId: member.userId,
        advanceToUserId: null,
        place: null,
      },
    };
    rerender(
      <TransactionModal open onOpenChange={vi.fn()} householdId="household-1" members={[member]} source={reminderSource} />
    );
    expect(screen.getByLabelText('金額')).toHaveValue('8500');
    expect(screen.getByLabelText('メモ')).toHaveValue('電気代');
  });

  it('登録して続けると日付等を維持し、金額・メモ・場所だけを空にする', async () => {
    const source: TransactionModalSource = { kind: 'create', type: 'expense' };
    render(
      <TransactionModal open onOpenChange={vi.fn()} householdId="household-1" members={[member]} source={source} />
    );

    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('メモ'), { target: { value: 'ランチ' } });
    fireEvent.change(screen.getByLabelText('場所（任意）'), { target: { value: '食堂' } });
    fireEvent.click(screen.getByRole('button', { name: '登録して続ける' }));

    await waitFor(() => expect(mocks.addTransaction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('金額')).toHaveValue(''));
    expect(screen.getByLabelText('メモ')).toHaveValue('');
    expect(screen.getByLabelText('場所（任意）')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('1,200円を登録しました');
  });
});
