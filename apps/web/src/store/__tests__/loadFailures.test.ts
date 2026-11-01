import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardStore } from '../useDashboardStore';
import { useTransactionStore } from '../useTransactionStore';
import { useHouseholdStore } from '../useHouseholdStore';
import { useYearlyDashboardStore } from '../useYearlyDashboardStore';
import type { Transaction } from '@/types/transaction';

const mocks = vi.hoisted(() => ({
  getTransactions: vi.fn(),
  getHousehold: vi.fn(),
  getHouseholdMembers: vi.fn(),
  getTransactionsByDateRange: vi.fn(),
}));
vi.mock('@/services/transactions', () => ({ ...mocks }));
vi.mock('@/services/households', () => ({ ...mocks }));

describe('読み込み失敗からの復帰', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    useDashboardStore.setState(useDashboardStore.getInitialState());
    useTransactionStore.setState(useTransactionStore.getInitialState());
    useHouseholdStore.setState(useHouseholdStore.getInitialState());
    useYearlyDashboardStore.setState(useYearlyDashboardStore.getInitialState());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('世帯取得失敗を未所属と区別し、再試行で未所属を確定できる', async () => {
    mocks.getHousehold.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null);
    await useHouseholdStore.getState().loadHousehold('user');
    expect(useHouseholdStore.getState()).toMatchObject({
      loadedUserId: null, loadError: 'offline', isLoading: false,
    });
    await useHouseholdStore.getState().loadHousehold('user');
    expect(useHouseholdStore.getState()).toMatchObject({
      loadedUserId: 'user', household: null, loadError: null,
    });
  });

  it('現在月の初回取得も通信し、失敗時にゼロの集計を作らない', async () => {
    const month = useTransactionStore.getState().currentMonth;
    mocks.getTransactions.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    await expect(useDashboardStore.getState().loadMonthlySummary('home', month)).rejects.toThrow('offline');
    expect(useDashboardStore.getState()).toMatchObject({ summary: null, error: 'offline', loadedKey: null });
    await useDashboardStore.getState().loadMonthlySummary('home', month);
    expect(useDashboardStore.getState()).toMatchObject({
      error: null, loadedKey: `home:${month}`, summary: { incomeTotal: 0, expenseTotal: 0, balance: 0 },
    });
  });

  it('月を切り替えた後に古い月の応答が届いても集計と取引を上書きしない', async () => {
    let finishOld!: (value: Transaction[]) => void;
    mocks.getTransactions
      .mockImplementationOnce(() => new Promise<Transaction[]>((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce([]);
    const oldRequest = useDashboardStore.getState().loadMonthlySummary('home', '2026-10');
    await useDashboardStore.getState().loadMonthlySummary('home', '2026-11');
    finishOld([{ id: 'old', type: 'expense', amount: 900, occurredOn: '2026-10-01', createdAt: '2026-10-01' } as Transaction]);
    await oldRequest;
    expect(useDashboardStore.getState()).toMatchObject({ loadedKey: 'home:2026-11', summary: { expenseTotal: 0 } });
    expect(useTransactionStore.getState().transactions).toEqual([]);
  });

  it('別ユーザーの世帯取得開始後に古いリクエストが完了しても表示対象を変えない', async () => {
    let finishOld!: (value: null) => void;
    mocks.getHousehold
      .mockImplementationOnce(() => new Promise<null>((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(null);
    const previousUser = useHouseholdStore.getState().loadHousehold('old-user');
    await useHouseholdStore.getState().loadHousehold('new-user');
    finishOld(null);
    await previousUser;
    expect(useHouseholdStore.getState().loadedUserId).toBe('new-user');
  });

  it('年次集計も取得失敗を保持し、再試行成功時だけ対象年の集計を表示できる', async () => {
    mocks.getTransactionsByDateRange.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    await expect(useYearlyDashboardStore.getState().loadYearlySummary('home', 2026)).rejects.toThrow('offline');
    expect(useYearlyDashboardStore.getState()).toMatchObject({ summary: null, loadedKey: null, error: 'offline' });
    await useYearlyDashboardStore.getState().loadYearlySummary('home', 2026);
    expect(useYearlyDashboardStore.getState()).toMatchObject({ loadedKey: 'home:2026', error: null, summary: { expenseTotal: 0 } });
  });
});
