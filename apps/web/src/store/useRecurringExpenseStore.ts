/**
 * 定期支出ストア
 * 
 * 定期支出の状態管理を行うZustandストア
 */

import { create } from 'zustand';
import type { RecurringExpense, RecurringExpenseData } from '@/types/transaction';
import {
  listRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  generateMissingTransactions,
} from '@/services/recurringExpenses';

/**
 * 定期支出ストアの状態
 */
interface RecurringExpenseState {
  /** 定期支出一覧 */
  recurringExpenses: RecurringExpense[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 送信状態 */
  isSubmitting: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * 定期支出ストアのアクション
 */
interface RecurringExpenseActions {
  /** 定期支出一覧を読み込み */
  loadRecurringExpenses: (householdId: string) => Promise<void>;
  /** 定期支出を追加 */
  addRecurringExpense: (data: RecurringExpenseData) => Promise<RecurringExpense>;
  /** 定期支出を更新 */
  updateRecurringExpense: (id: string, data: Partial<RecurringExpenseData>) => Promise<RecurringExpense>;
  /** 定期支出を削除 */
  removeRecurringExpense: (id: string) => Promise<void>;
  /** 指定月の未作成トランザクションを生成 */
  generateMissingTransactions: (householdId: string, targetMonth: string) => Promise<number>;
  /** エラーをクリア */
  clearError: () => void;
  /** ストアをリセット */
  reset: () => void;
}

/**
 * 定期支出ストアの型
 */
type RecurringExpenseStore = RecurringExpenseState & RecurringExpenseActions;

/**
 * 定期支出ストアの初期状態
 */
const initialState: RecurringExpenseState = {
  recurringExpenses: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

/**
 * 定期支出ストア
 */
export const useRecurringExpenseStore = create<RecurringExpenseStore>((set, get) => ({
  ...initialState,

  /**
   * 定期支出一覧を読み込み
   */
  loadRecurringExpenses: async (householdId: string) => {
    set({ isLoading: true, error: null });

    try {
      const recurringExpenses = await listRecurringExpenses(householdId);
      set({ recurringExpenses, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期支出一覧の読み込みに失敗しました';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * 定期支出を追加
   */
  addRecurringExpense: async (data: RecurringExpenseData) => {
    set({ isSubmitting: true, error: null });

    try {
      const newRecurringExpense = await createRecurringExpense(data);
      const { recurringExpenses } = get();
      set({
        recurringExpenses: [newRecurringExpense, ...recurringExpenses],
        isSubmitting: false,
      });
      return newRecurringExpense;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期支出の作成に失敗しました';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * 定期支出を更新
   */
  updateRecurringExpense: async (id: string, data: Partial<RecurringExpenseData>) => {
    set({ isSubmitting: true, error: null });

    try {
      const updatedRecurringExpense = await updateRecurringExpense(id, data);
      const { recurringExpenses } = get();
      set({
        recurringExpenses: recurringExpenses.map((expense) =>
          expense.id === id ? updatedRecurringExpense : expense
        ),
        isSubmitting: false,
      });
      return updatedRecurringExpense;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期支出の更新に失敗しました';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * 定期支出を削除
   */
  removeRecurringExpense: async (id: string) => {
    set({ isSubmitting: true, error: null });

    try {
      await deleteRecurringExpense(id);
      const { recurringExpenses } = get();
      set({
        recurringExpenses: recurringExpenses.filter((expense) => expense.id !== id),
        isSubmitting: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期支出の削除に失敗しました';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * 指定月の未作成トランザクションを生成
   */
  generateMissingTransactions: async (householdId: string, targetMonth: string) => {
    set({ isLoading: true, error: null });

    try {
      const generatedCount = await generateMissingTransactions(householdId, targetMonth);
      set({ isLoading: false });
      return generatedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'トランザクション生成に失敗しました';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * エラーをクリア
   */
  clearError: () => set({ error: null }),

  /**
   * ストアをリセット
   */
  reset: () => set(initialState),
}));
