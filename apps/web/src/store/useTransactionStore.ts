/**
 * 取引管理ストア
 * 
 * 取引一覧、最近の取引、作成・削除アクションを管理します。
 */

import { create } from 'zustand';
import type { Transaction, TransactionData } from '@/types/transaction';
import {
  createTransaction as createTransactionService,
  deleteTransaction as deleteTransactionService,
  getRecentTransactions as getRecentTransactionsService,
  getTransactions as getTransactionsService,
} from '@/services/transactions';

/**
 * 月 (YYYY-MM) の文字列を取得
 * 
 * @param date - 日付オブジェクト
 * @returns YYYY-MM 形式の文字列
 */
function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 日付文字列から YYYY-MM を抽出
 * 
 * @param occurredOn - YYYY-MM-DD 形式の文字列
 * @returns YYYY-MM 形式の文字列
 */
function extractMonth(occurredOn: string): string {
  return occurredOn.slice(0, 7);
}

/**
 * 取引を日付降順で並べ替え
 */
function sortTransactionsDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.occurredOn === b.occurredOn) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return b.occurredOn.localeCompare(a.occurredOn);
  });
}

const DEFAULT_RECENT_LIMIT = 5;

/**
 * 取引ストアの型定義
 */
interface TransactionStore {
  /** 現在の月 (YYYY-MM) */
  currentMonth: string;
  /** 取引一覧 */
  transactions: Transaction[];
  /** 最近の取引 */
  recentTransactions: Transaction[];
  /** 最近の取引取得時の上限 */
  recentLimit: number;
  /** ローディング状態 */
  isLoading: boolean;
  /** 最近の取引のローディング状態 */
  isRecentLoading: boolean;
  /** 作成・削除時のローディング状態 */
  isSubmitting: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 取引一覧を読み込み */
  loadTransactions: (householdId: string, month: string) => Promise<void>;
  /** 最近の取引を読み込み */
  loadRecentTransactions: (householdId: string, limit?: number) => Promise<void>;
  /** 取引を追加 */
  addTransaction: (data: TransactionData) => Promise<Transaction>;
  /** 取引を削除 */
  removeTransaction: (id: string) => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 取引ストア
 */
export const useTransactionStore = create<TransactionStore>((set) => ({
  currentMonth: formatMonth(new Date()),
  transactions: [],
  recentTransactions: [],
  recentLimit: DEFAULT_RECENT_LIMIT,
  isLoading: false,
  isRecentLoading: false,
  isSubmitting: false,
  error: null,

  /**
   * 取引一覧を読み込み
   */
  loadTransactions: async (householdId: string, month: string) => {
    try {
      set({ isLoading: true, error: null, currentMonth: month });
      const transactions = await getTransactionsService(householdId, month);
      set({
        transactions: sortTransactionsDesc(transactions),
        isLoading: false,
      });
    } catch (error) {
      console.error('取引読み込みエラー:', error);
      set({
        error: error instanceof Error ? error.message : '取引の取得に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * 最近の取引を読み込み
   */
  loadRecentTransactions: async (householdId: string, limit = DEFAULT_RECENT_LIMIT) => {
    try {
      set({ error: null, recentLimit: limit, isRecentLoading: true });
      const transactions = await getRecentTransactionsService(householdId, limit);
      set({
        recentTransactions: sortTransactionsDesc(transactions),
        isRecentLoading: false,
      });
    } catch (error) {
      console.error('最近の取引読み込みエラー:', error);
      set({
        error: error instanceof Error ? error.message : '最近の取引の取得に失敗しました',
        isRecentLoading: false,
      });
      throw error;
    }
  },

  /**
   * 取引を追加
   */
  addTransaction: async (data: TransactionData) => {
    try {
      set({ isSubmitting: true, error: null });
      const transaction = await createTransactionService(data);

      set((state) => {
        const monthKey = extractMonth(transaction.occurredOn);
        const shouldIncludeInCurrent = state.currentMonth === monthKey;

        const updatedTransactions = shouldIncludeInCurrent
          ? sortTransactionsDesc([...state.transactions, transaction])
          : state.transactions;

        const updatedRecent = sortTransactionsDesc([
          transaction,
          ...state.recentTransactions,
        ]).slice(0, state.recentLimit);

        return {
          transactions: updatedTransactions,
          recentTransactions: updatedRecent,
          isSubmitting: false,
        };
      });

      return transaction;
    } catch (error) {
      console.error('取引追加エラー:', error);
      set({
        error: error instanceof Error ? error.message : '取引の作成に失敗しました',
        isSubmitting: false,
      });
      throw error;
    }
  },

  /**
   * 取引を削除
   */
  removeTransaction: async (id: string) => {
    try {
      set({ isSubmitting: true, error: null });
      await deleteTransactionService(id);

      set((state) => ({
        transactions: state.transactions.filter((transaction) => transaction.id !== id),
        recentTransactions: state.recentTransactions.filter(
          (transaction) => transaction.id !== id
        ),
        isSubmitting: false,
      }));
    } catch (error) {
      console.error('取引削除エラー:', error);
      set({
        error: error instanceof Error ? error.message : '取引の削除に失敗しました',
        isSubmitting: false,
      });
      throw error;
    }
  },

  /**
   * エラーをクリア
   */
  clearError: () => set({ error: null }),
}));
