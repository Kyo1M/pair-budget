/**
 * 立替残高ストア
 * 
 * 世帯内の立替残高情報を管理します。
 */

import { create } from 'zustand';
import type { HouseholdBalance, Settlement, SettlementData } from '@/types/settlement';
import {
  getHouseholdBalances,
  getSettlements,
  createSettlement,
  deleteSettlement,
} from '@/services/settlements';

const BALANCE_HIGHLIGHT_DURATION = 1200;

/**
 * 立替残高ストアの型定義
 */
interface SettlementStore {
  /** 立替残高一覧 */
  balances: HouseholdBalance[];
  /** 精算履歴 */
  settlements: Settlement[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 精算履歴のローディング状態 */
  isSettlementsLoading: boolean;
  /** 送信中状態 */
  isSubmitting: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 残高ハイライト対象 */
  balanceHighlights: Record<string, boolean>;
  /** 残高を読み込み */
  loadBalances: (householdId: string) => Promise<void>;
  /** 精算履歴を読み込み */
  loadSettlements: (householdId: string) => Promise<void>;
  /** 精算を追加 */
  addSettlement: (data: SettlementData) => Promise<Settlement>;
  /** 精算を削除 */
  removeSettlement: (id: string, householdId: string) => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 立替残高ストア
 */
export const useSettlementStore = create<SettlementStore>((set) => {
  /**
   * 残高データを反映し、必要に応じてハイライトを付与
   */
  const applyBalances = (
    balances: HouseholdBalance[],
    highlightChanges: boolean
  ) => {
    let changedUserIds: string[] = [];

    set((state) => {
      const nextHighlights: Record<string, boolean> = highlightChanges
        ? { ...state.balanceHighlights }
        : {};

      if (highlightChanges) {
        const previousBalances = state.balances;
        changedUserIds = balances
          .filter((balance) => {
            const prev = previousBalances.find(
              (item) => item.userId === balance.userId
            );
            return !prev || prev.balanceAmount !== balance.balanceAmount;
          })
          .map((balance) => balance.userId);

        changedUserIds.forEach((userId) => {
          nextHighlights[userId] = true;
        });
      }

      return {
        balances,
        balanceHighlights: nextHighlights,
        isLoading: false,
      };
    });

    if (highlightChanges && changedUserIds.length > 0) {
      setTimeout(() => {
        set((state) => {
          const updated = { ...state.balanceHighlights };
          changedUserIds.forEach((userId) => {
            delete updated[userId];
          });
          return { balanceHighlights: updated };
        });
      }, BALANCE_HIGHLIGHT_DURATION);
    }
  };

  return {
    balances: [],
    settlements: [],
    isLoading: false,
    isSettlementsLoading: false,
    isSubmitting: false,
    error: null,
    balanceHighlights: {},

    /**
     * 残高を読み込み
     */
    loadBalances: async (householdId: string) => {
      try {
        set({ isLoading: true, error: null });
        const balances = await getHouseholdBalances(householdId);
        applyBalances(balances, false);
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
     * 精算履歴を読み込み
     */
    loadSettlements: async (householdId: string) => {
      try {
        set({ isSettlementsLoading: true, error: null });
        const settlements = await getSettlements(householdId);
        set({ settlements, isSettlementsLoading: false });
      } catch (error) {
        console.error('精算履歴読み込みエラー:', error);
        set({
          error: error instanceof Error ? error.message : '精算履歴の取得に失敗しました',
          isSettlementsLoading: false,
        });
        throw error;
      }
    },

    /**
     * 精算を追加
     */
    addSettlement: async (data: SettlementData) => {
      try {
        set({ isSubmitting: true, error: null });
        const settlement = await createSettlement(data);
        set((state) => ({
          settlements: [settlement, ...state.settlements],
          isSubmitting: false,
        }));

        const balances = await getHouseholdBalances(data.householdId);
        applyBalances(balances, true);

        return settlement;
      } catch (error) {
        console.error('精算追加エラー:', error);
        set({
          error: error instanceof Error ? error.message : '精算の記録に失敗しました',
          isSubmitting: false,
        });
        throw error;
      }
    },

    /**
     * 精算を削除
     */
    removeSettlement: async (id: string, householdId: string) => {
      try {
        set({ isSubmitting: true, error: null });
        await deleteSettlement(id);
        set((state) => ({
          settlements: state.settlements.filter((settlement) => settlement.id !== id),
          isSubmitting: false,
        }));

        const balances = await getHouseholdBalances(householdId);
        applyBalances(balances, true);
      } catch (error) {
        console.error('精算削除エラー:', error);
        set({
          error: error instanceof Error ? error.message : '精算の削除に失敗しました',
          isSubmitting: false,
        });
        throw error;
      }
    },

    /**
     * エラーをクリア
     */
    clearError: () => set({ error: null }),
  };
});
