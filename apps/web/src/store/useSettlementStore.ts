/**
 * 立替残高ストア
 * 
 * 世帯内の立替残高情報を管理します。
 */

import { create } from 'zustand';
import type { HouseholdBalance } from '@/types/settlement';
import { getHouseholdBalances } from '@/services/settlements';

/**
 * 立替残高ストアの型定義
 */
interface SettlementStore {
  /** 立替残高一覧 */
  balances: HouseholdBalance[];
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 残高を読み込み */
  loadBalances: (householdId: string) => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 立替残高ストア
 */
export const useSettlementStore = create<SettlementStore>((set) => ({
  balances: [],
  isLoading: false,
  error: null,

  /**
   * 残高を読み込み
   */
  loadBalances: async (householdId: string) => {
    try {
      set({ isLoading: true, error: null });
      const balances = await getHouseholdBalances(householdId);
      set({
        balances,
        isLoading: false,
      });
    } catch (error) {
      console.error('立替残高読み込みエラー:', error);
      set({
        error: error instanceof Error ? error.message : '立替残高の取得に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * エラーをクリア
   */
  clearError: () => set({ error: null }),
}));
