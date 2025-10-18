/**
 * 年次ダッシュボードストア
 */

import { create } from 'zustand';
import { getTransactionsByDateRange } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';

interface MonthlyDifference {
  month: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
}

interface YearlySummary {
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
}

interface YearlyDashboardStore {
  /** 選択中の年 */
  selectedYear: number;
  /** 年次サマリー */
  summary: YearlySummary | null;
  /** 月ごとの差額 */
  monthlyDifferences: MonthlyDifference[];
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 年次サマリーを読み込み */
  loadYearlySummary: (householdId: string, year: number) => Promise<void>;
  /** 年を選択 */
  setSelectedYear: (year: number) => void;
  /** エラーをクリア */
  clearError: () => void;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getYearDateRange(year: number) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  } as const;
}

function buildMonthlyDifferences(transactions: Transaction[]): MonthlyDifference[] {
  const months: MonthlyDifference[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0,
  }));

  transactions.forEach((transaction) => {
    const occurredOn = transaction.occurredOn;
    const month = Number(occurredOn.slice(5, 7));
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return;
    }

    const entry = months[month - 1];

    if (transaction.type === 'income') {
      entry.incomeTotal += transaction.amount;
    } else {
      entry.expenseTotal += transaction.amount;
    }

    entry.balance = entry.incomeTotal - entry.expenseTotal;
  });

  return months;
}

function calculateYearlySummary(transactions: Transaction[]): YearlySummary {
  return transactions.reduce<YearlySummary>(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.incomeTotal += transaction.amount;
      } else {
        acc.expenseTotal += transaction.amount;
      }
      acc.balance = acc.incomeTotal - acc.expenseTotal;
      return acc;
    },
    {
      incomeTotal: 0,
      expenseTotal: 0,
      balance: 0,
    }
  );
}

export const useYearlyDashboardStore = create<YearlyDashboardStore>((set) => ({
  selectedYear: getCurrentYear(),
  summary: null,
  monthlyDifferences: [],
  isLoading: false,
  error: null,

  async loadYearlySummary(householdId: string, year: number) {
    set({ isLoading: true, error: null, selectedYear: year });
    try {
      const { startDate, endDate } = getYearDateRange(year);
      const transactions = await getTransactionsByDateRange(householdId, startDate, endDate);
      const summary = calculateYearlySummary(transactions);
      const monthlyDifferences = buildMonthlyDifferences(transactions);
      set({ summary, monthlyDifferences, isLoading: false });
    } catch (error) {
      console.error('年次サマリー取得エラー:', error);
      set({
        error: error instanceof Error ? error.message : '年次サマリーの取得に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedYear(year: number) {
    set({ selectedYear: year });
  },

  clearError() {
    set({ error: null });
  },
}));

export type { MonthlyDifference, YearlySummary };
