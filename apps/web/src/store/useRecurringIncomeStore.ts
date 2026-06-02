/**
 * 定期収入ストア
 *
 * 定期収入の状態管理を行うZustandストア
 */

import { create } from 'zustand';
import type { RecurringIncome, RecurringIncomeData, IncomeReminder } from '@/types/transaction';
import {
  listRecurringIncomes,
  createRecurringIncome,
  updateRecurringIncome,
  deleteRecurringIncome,
  getIncomeReminders,
} from '@/services/recurringIncomes';

/**
 * 定期収入ストアの状態
 */
interface RecurringIncomeState {
  /** 定期収入一覧 */
  recurringIncomes: RecurringIncome[];
  /** 収入リマインダー一覧 */
  incomeReminders: IncomeReminder[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 送信状態 */
  isSubmitting: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * 定期収入ストアのアクション
 */
interface RecurringIncomeActions {
  /** 定期収入一覧を読み込み */
  loadRecurringIncomes: (householdId: string) => Promise<void>;
  /** 定期収入を追加 */
  addRecurringIncome: (data: RecurringIncomeData) => Promise<RecurringIncome>;
  /** 定期収入を更新 */
  updateRecurringIncome: (id: string, data: Partial<RecurringIncomeData>) => Promise<RecurringIncome>;
  /** 定期収入を削除 */
  removeRecurringIncome: (id: string) => Promise<void>;
  /** 収入リマインダーを読み込み */
  loadIncomeReminders: (householdId: string) => Promise<void>;
  /** リマインダーを一時的に非表示 */
  dismissIncomeReminder: (id: string) => void;
  /** エラーをクリア */
  clearError: () => void;
  /** ストアをリセット */
  reset: () => void;
}

/**
 * 定期収入ストアの型
 */
type RecurringIncomeStore = RecurringIncomeState & RecurringIncomeActions;

/**
 * 定期収入ストアの初期状態
 */
const initialState: RecurringIncomeState = {
  recurringIncomes: [],
  incomeReminders: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

/**
 * 定期収入ストア
 */
export const useRecurringIncomeStore = create<RecurringIncomeStore>((set, get) => ({
  ...initialState,

  /**
   * 定期収入一覧を読み込み
   */
  loadRecurringIncomes: async (householdId: string) => {
    set({ isLoading: true, error: null });

    try {
      const recurringIncomes = await listRecurringIncomes(householdId);
      set({ recurringIncomes, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期収入一覧の読み込みに失敗しました';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * 定期収入を追加
   */
  addRecurringIncome: async (data: RecurringIncomeData) => {
    set({ isSubmitting: true, error: null });

    try {
      const newRecurringIncome = await createRecurringIncome(data);
      const { recurringIncomes } = get();
      set({
        recurringIncomes: [newRecurringIncome, ...recurringIncomes],
        isSubmitting: false,
      });
      return newRecurringIncome;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期収入の作成に失敗しました';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * 定期収入を更新
   */
  updateRecurringIncome: async (id: string, data: Partial<RecurringIncomeData>) => {
    set({ isSubmitting: true, error: null });

    try {
      const updatedRecurringIncome = await updateRecurringIncome(id, data);
      const { recurringIncomes } = get();
      set({
        recurringIncomes: recurringIncomes.map((income) =>
          income.id === id ? updatedRecurringIncome : income
        ),
        isSubmitting: false,
      });
      return updatedRecurringIncome;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期収入の更新に失敗しました';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * 定期収入を削除
   */
  removeRecurringIncome: async (id: string) => {
    set({ isSubmitting: true, error: null });

    try {
      await deleteRecurringIncome(id);
      const { recurringIncomes, incomeReminders } = get();
      set({
        recurringIncomes: recurringIncomes.filter((income) => income.id !== id),
        // 削除した定期収入に対応するリマインダー（id が定期収入IDと一致）も即座に除去し、
        // バナーに削除済みの収入が残り続けるのを防ぐ。
        incomeReminders: incomeReminders.filter((reminder) => reminder.id !== id),
        isSubmitting: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '定期収入の削除に失敗しました';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * 収入リマインダーを読み込み
   */
  loadIncomeReminders: async (householdId: string) => {
    try {
      const reminders = await getIncomeReminders(householdId);
      set({ incomeReminders: reminders });
    } catch (error) {
      console.error('収入リマインダー読み込みエラー:', error);
    }
  },

  /**
   * リマインダーを一時的に非表示
   */
  dismissIncomeReminder: (id: string) => {
    const { incomeReminders } = get();
    set({
      incomeReminders: incomeReminders.filter((r) => r.id !== id),
    });
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
