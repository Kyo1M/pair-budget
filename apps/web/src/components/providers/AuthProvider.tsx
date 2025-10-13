/**
 * 認証プロバイダー
 * 
 * アプリケーション全体に認証状態を提供します。
 * - セッションの初期化
 * - 認証状態の変更監視
 * - 自動セッション更新
 */

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthProviderのProps型定義
 */
interface AuthProviderProps {
  /** 子コンポーネント */
  children: React.ReactNode;
}

/**
 * 認証プロバイダーコンポーネント
 * 
 * アプリケーションのルートに配置して、全体に認証状態を提供します。
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 認証プロバイダー
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    // 初回セッションチェック
    checkSession();

    // Supabaseクライアントを作成
    const supabase = createClient();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更:', event, session?.user?.email);

      // セッション情報を更新
      useAuthStore.setState({
        session,
        user: session?.user ?? null,
      });
    });

    // クリーンアップ
    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  return <>{children}</>;
}

