// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getSession: mocks.getSession } }),
}));

describe('認証サーバー接続失敗時のmiddleware', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('接続失敗はログアウト扱いにせず、503の再試行画面を返す', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: { status: 0 } });
    const response = await middleware(new NextRequest('https://example.com/'));
    expect(response.status).toBe(503);
    expect(response.headers.get('x-middleware-rewrite')).toBe('https://example.com/connection-error');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('認証サービスが応答しなくても8秒で再試行画面を返す', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    const response = middleware(new NextRequest('https://example.com/'));
    await vi.advanceTimersByTimeAsync(8_000);
    expect((await response).status).toBe(503);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('通信例外でも再試行画面を返す', async () => {
    mocks.getSession.mockRejectedValue(new TypeError('fetch failed'));
    expect((await middleware(new NextRequest('https://example.com/'))).status).toBe(503);
  });

  it('通常の未ログインはログイン画面へ案内する', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const response = await middleware(new NextRequest('https://example.com/'));
    expect(response.headers.get('location')).toBe('https://example.com/auth');
  });
});
