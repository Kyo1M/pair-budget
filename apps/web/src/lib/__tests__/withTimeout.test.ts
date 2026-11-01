import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers());

  it('応答がない読み込みを終了し、成功後にはタイマーを残さない', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}));
    const assertion = expect(pending).rejects.toThrow('接続に時間がかかっています');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
    await expect(withTimeout(Promise.resolve('ready'))).resolves.toBe('ready');
    expect(vi.getTimerCount()).toBe(0);
  });
});
