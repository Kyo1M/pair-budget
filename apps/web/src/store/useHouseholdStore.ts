/**
 * 世帯管理ストア
 * 
 * 世帯情報、メンバー情報、参加コードの状態管理を行います。
 */

import { create } from 'zustand';
import type { Household, HouseholdMember, JoinCode } from '@/types/household';
import {
  createHousehold as createHouseholdService,
  getHousehold as getHouseholdService,
  getHouseholdMembers as getHouseholdMembersService,
} from '@/services/households';
import {
  generateJoinCode as generateJoinCodeService,
  consumeJoinCode as consumeJoinCodeService,
} from '@/services/joinCodes';

/**
 * 世帯ストアの型定義
 */
interface HouseholdStore {
  /** 現在の世帯情報 */
  household: Household | null;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 現在の参加コード */
  joinCode: JoinCode | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 世帯情報を読み込み */
  loadHousehold: (userId: string) => Promise<void>;
  /** 世帯を作成 */
  createHousehold: (name: string, userId: string) => Promise<void>;
  /** 参加コードを発行 */
  generateJoinCode: (householdId: string, userId: string) => Promise<void>;
  /** 参加コードを使用して世帯に参加 */
  joinHousehold: (code: string, userId: string) => Promise<void>;
  /** メンバー一覧を再取得 */
  refreshMembers: (householdId: string) => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
  /** ストアをリセット */
  reset: () => void;
}

/**
 * 世帯管理ストア
 */
export const useHouseholdStore = create<HouseholdStore>((set, get) => ({
  household: null,
  members: [],
  joinCode: null,
  isLoading: false,
  error: null,

  /**
   * 世帯情報を読み込み
   */
  loadHousehold: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const household = await getHouseholdService(userId);
      
      if (household) {
        // 世帯が見つかった場合、メンバー情報も取得
        const members = await getHouseholdMembersService(household.id);
        set({ household, members, isLoading: false });
      } else {
        set({ household: null, members: [], isLoading: false });
      }
    } catch (error) {
      console.error('世帯読み込みエラー:', error);
      set({
        error: error instanceof Error ? error.message : '世帯情報の読み込みに失敗しました',
        isLoading: false,
      });
    }
  },

  /**
   * 世帯を作成
   */
  createHousehold: async (name: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const household = await createHouseholdService(name, userId);
      
      // メンバー情報を取得
      const members = await getHouseholdMembersService(household.id);
      
      set({ household, members, isLoading: false });
    } catch (error) {
      console.error('世帯作成エラー:', error);
      set({
        error: error instanceof Error ? error.message : '世帯の作成に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * 参加コードを発行
   */
  generateJoinCode: async (householdId: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const joinCode = await generateJoinCodeService(householdId, userId);
      set({ joinCode, isLoading: false });
    } catch (error) {
      console.error('参加コード発行エラー:', error);
      set({
        error: error instanceof Error ? error.message : '参加コードの発行に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * 参加コードを使用して世帯に参加
   */
  joinHousehold: async (code: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      await consumeJoinCodeService(code, userId);
      
      // 世帯情報を再取得
      await get().loadHousehold(userId);
      
      set({ isLoading: false });
    } catch (error) {
      console.error('世帯参加エラー:', error);
      set({
        error: error instanceof Error ? error.message : '世帯への参加に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * メンバー一覧を再取得
   */
  refreshMembers: async (householdId: string) => {
    try {
      const members = await getHouseholdMembersService(householdId);
      set({ members });
    } catch (error) {
      console.error('メンバー情報更新エラー:', error);
      set({
        error: error instanceof Error ? error.message : 'メンバー情報の更新に失敗しました',
      });
    }
  },

  /**
   * エラーをクリア
   */
  clearError: () => set({ error: null }),

  /**
   * ストアをリセット
   */
  reset: () =>
    set({
      household: null,
      members: [],
      joinCode: null,
      isLoading: false,
      error: null,
    }),
}));

