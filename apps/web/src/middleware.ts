/**
 * Next.js Middleware
 * 
 * 認証状態に基づいてリダイレクト処理を行います。
 * - 未認証ユーザーは /auth にリダイレクト
 * - 認証済みユーザーが /auth にアクセスした場合は / にリダイレクト
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { withTimeout } from '@/lib/withTimeout';

/**
 * Middleware関数
 * 
 * @param request - Next.jsリクエストオブジェクト
 * @returns Next.jsレスポンスオブジェクト
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 認証先の停止・通信失敗を、未ログインや25秒の無応答にしない。
  const unavailable = () => NextResponse.rewrite(new URL('/connection-error', request.url), {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': '10' },
  });
  let session;
  try {
    const result = await withTimeout(supabase.auth.getSession(), 8_000);
    if (result.error && (result.error.status === 0 || result.error.status === 429 || (result.error.status ?? 500) >= 500)) {
      return unavailable();
    }
    session = result.data.session;
  } catch {
    return unavailable();
  }

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');

  // 認証済みユーザーが /auth にアクセスした場合、/ にリダイレクト
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 未認証ユーザーが /auth 以外にアクセスした場合、/auth にリダイレクト
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return response;
}

/**
 * Middlewareの適用対象パス
 */
export const config = {
  matcher: [
    /*
     * 以下を除く全てのパスにMiddlewareを適用:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     * - connection-error (認証先の障害中にも表示する再試行画面)
     * - public配下のファイル (画像、SVGなど)
     */
    '/((?!connection-error(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

