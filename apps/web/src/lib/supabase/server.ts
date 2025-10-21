/**
 * Supabase サーバーサイド用クライアント
 * 
 * Server Components、Route Handlers、Server Actionsで使用する
 * Supabaseクライアントを提供します。
 */

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * サーバーサイド用のSupabaseクライアントを作成
 * 
 * @returns Supabaseクライアントインスタンス
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentからの呼び出し時は無視
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}

