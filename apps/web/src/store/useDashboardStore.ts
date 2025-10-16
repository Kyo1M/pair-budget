/**
 * ダッシュボード用ストア
 * 
 * 月次サマリーと月の選択状態を管理します。
 */

import { create } from 'zustand';
import type { MonthlySummary, Transaction } from '@/types/transaction';
import { useTransactionStore } from '@/store/useTransactionStore';

/**
 * 現在の月 (YYYY-MM) を取得
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 取引一覧から月次サマリーを計算
 * 
 * @param transactions - 取引一覧
 * @returns 月次サマリー
 */
function calculateSummary(transactions: Transaction[]): MonthlySummary {
  return transactions.reduce<MonthlySummary>(
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

/**
 * ダッシュボードストアの型定義
 */
interface DashboardStore {
  /** 月次サマリー */
  summary: MonthlySummary | null;
  /** 選択中の月 */
  selectedMonth: string;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 月次サマリーを読み込み */
  loadMonthlySummary: (householdId: string, month: string) => Promise<void>;
  /** 月を選択 */
  setSelectedMonth: (month: string) => void;
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * ダッシュボードストア
 */
export const useDashboardStore = create<DashboardStore>((set) => ({
  summary: null,
  selectedMonth: getCurrentMonth(),
  isLoading: false,
  error: null,

  /**
   * 月次サマリーを読み込み
   */
  loadMonthlySummary: async (householdId: string, month: string) => {
    const transactionStore = useTransactionStore.getState();
    set({ isLoading: true, error: null, selectedMonth: month });

    try {
      if (transactionStore.currentMonth !== month) {
        await transactionStore.loadTransactions(householdId, month);
      }

      const transactions = useTransactionStore.getState().transactions;
      set({
        summary: calculateSummary(transactions),
        isLoading: false,
      });
    } catch (error) {
      console.error('月次サマリー取得エラー:', error);
      set({
        error: error instanceof Error ? error.message : '月次サマリーの取得に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * 月を選択
   */
  setSelectedMonth: (month: string) => set({ selectedMonth: month }),

  /**
   * エラーをクリア
   */
  clearError: () => set({ error: null }),
}));
