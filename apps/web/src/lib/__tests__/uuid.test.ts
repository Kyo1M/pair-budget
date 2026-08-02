import { describe, expect, it, vi } from 'vitest';
import { createUuid } from '@/lib/uuid';

describe('createUuid', () => {
  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '11111111-2222-4333-8444-555555555555');
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes);

    expect(createUuid({ randomUUID, getRandomValues })).toBe(
      '11111111-2222-4333-8444-555555555555'
    );
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('generates an RFC 4122 version 4 UUID when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index));
      return bytes;
    });

    expect(createUuid({ getRandomValues })).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
