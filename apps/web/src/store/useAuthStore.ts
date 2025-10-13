/**
 * 認証状態管理ストア
 * 
 * Supabase認証のセッション管理とユーザー情報を管理します。
 * - ユーザー情報の保持
 * - セッション管理
 * - サインイン・サインアップ・サインアウト機能
 */

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/**
 * 認証ストアの型定義
 */
interface AuthStore {
  /** 現在のユーザー情報 */
  user: User | null;
  /** 現在のセッション情報 */
  session: Session | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** セッションをチェックして状態を更新 */
  checkSession: () => Promise<void>;
  /** メールアドレスとパスワードでサインイン */
  signIn: (email: string, password: string) => Promise<void>;
  /** メールアドレスとパスワードで新規登録 */
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  /** サインアウト */
  signOut: () => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 認証ストア
 */
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,

  /**
   * セッションをチェックして状態を更新
   */
  checkSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });
    } catch (error) {
      console.error('セッションチェックエラー:', error);
      set({
        error: error instanceof Error ? error.message : 'セッションの取得に失敗しました',
        session: null,
        user: null,
        isLoading: false,
      });
    }
  },

  /**
   * メールアドレスとパスワードでサインイン
   */
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
      });
    } catch (error) {
      console.error('サインインエラー:', error);
      set({
        error: error instanceof Error ? error.message : 'サインインに失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * メールアドレスとパスワードで新規登録
   */
  signUp: async (email: string, password: string, name?: string) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email,
          },
        },
      });

      if (error) {
        throw error;
      }

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
      });
    } catch (error) {
      console.error('サインアップエラー:', error);
      set({
        error: error instanceof Error ? error.message : '新規登録に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * サインアウト
   */
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      set({
        session: null,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('サインアウトエラー:', error);
      set({
        error: error instanceof Error ? error.message : 'サインアウトに失敗しました',
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

