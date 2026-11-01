import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import Home from './page';
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useSettlementStore } from '@/store/useSettlementStore';

const mocks = vi.hoisted(() => ({
  getHousehold: vi.fn(), getHouseholdMembers: vi.fn(), getTransactions: vi.fn(),
  getRecentTransactions: vi.fn(), getHouseholdBalances: vi.fn(), getSettlements: vi.fn(),
  generateFixedTransactionsByDate: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/services/households', () => ({ ...mocks }));
vi.mock('@/services/transactions', () => ({ ...mocks }));
vi.mock('@/services/settlements', () => ({ ...mocks }));
vi.mock('@/services/recurringExpenses', () => ({
  generateFixedTransactionsByDate: mocks.generateFixedTransactionsByDate,
  listRecurringExpenses: async () => [], getVariableExpenseReminders: async () => [],
}));
vi.mock('@/services/recurringIncomes', () => ({
  listRecurringIncomes: async () => [], getIncomeReminders: async () => [],
}));
vi.mock('@/components/modals/TransactionModal', () => ({ TransactionModal: () => null }));
vi.mock('@/components/modals/ReceiptCaptureModal', () => ({ ReceiptCaptureModal: () => null }));
vi.mock('@/components/modals/SettlementModal', () => ({ SettlementModal: () => null }));
vi.mock('@/components/modals/ShareJoinCodeModal', () => ({ ShareJoinCodeModal: () => null }));

const household = {
  id: 'household', name: 'テスト世帯', ownerUserId: 'user', createdAt: '', updatedAt: '',
};

describe('ホームの通信エラー表示と再試行', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.setState({ ...useAuthStore.getInitialState(), user: { id: 'user' } as User, isLoading: false });
    useHouseholdStore.setState(useHouseholdStore.getInitialState());
    useDashboardStore.setState(useDashboardStore.getInitialState());
    useTransactionStore.setState(useTransactionStore.getInitialState());
    useSettlementStore.setState(useSettlementStore.getInitialState());
    mocks.getHousehold.mockResolvedValue(household);
    mocks.getHouseholdMembers.mockResolvedValue([]);
    mocks.getTransactions.mockResolvedValue([]);
    mocks.getRecentTransactions.mockResolvedValue([]);
    mocks.getHouseholdBalances.mockResolvedValue([]);
    mocks.getSettlements.mockResolvedValue([]);
    mocks.generateFixedTransactionsByDate.mockResolvedValue(0);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('世帯取得失敗では作成画面を表示せず、再試行成功後だけ未所属を表示する', async () => {
    mocks.getHousehold.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null);
    render(<Home />);
    expect(screen.queryByRole('button', { name: '世帯を作成' })).not.toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('世帯情報を取得できませんでした');
    expect(screen.queryByRole('button', { name: '世帯を作成' })).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('button', { name: '世帯を作成' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('集計取得失敗では金額と空の取引一覧を隠し、再試行成功後にゼロを表示する', async () => {
    mocks.getTransactions.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(<Home />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('この月の取引と集計を取得できませんでした');
    expect(screen.queryByText('収入合計')).not.toBeInTheDocument();
    expect(screen.queryByText('まだ取引が登録されていません')).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: '再試行' }));
    expect(await screen.findByText('収入合計')).toBeInTheDocument();
    expect(screen.getAllByText('￥0')).toHaveLength(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('残高取得失敗を精算済みと表示せず、他の読み込み失敗にも妨げられず再試行できる', async () => {
    mocks.generateFixedTransactionsByDate.mockRejectedValue(new Error('offline'));
    mocks.getHouseholdBalances.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(<Home />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('立替残高を取得できませんでした');
    expect(screen.queryByText('未精算の立替はありません')).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: '再試行' }));
    expect(await screen.findByText('未精算の立替はありません')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getHouseholdBalances).toHaveBeenCalledTimes(2));
  });
});
