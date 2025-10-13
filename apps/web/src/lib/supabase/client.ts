/**
 * Supabase クライアントサイド用クライアント
 * 
 * ブラウザ環境で使用するSupabaseクライアントを提供します。
 * Cookie を使用してセッションを管理します。
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * クライアントサイド用のSupabaseクライアントを作成
 * 
 * @returns Supabaseクライアントインスタンス
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

