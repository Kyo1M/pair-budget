import { describe, expect, it } from 'vitest';
import { receiptOcrResultSchema } from '@/types/receipt';

describe('receiptOcrResultSchema', () => {
  it('日本のレシートから抽出した構造化結果を受け入れる', () => {
    const result = receiptOcrResultSchema.parse({
      amount: 1234,
      occurredOn: '2026-08-01',
      place: 'サンプルスーパー 渋谷店',
      category: 'groceries',
      ambiguousFields: [],
      warnings: [],
    });

    expect(result.amount).toBe(1234);
    expect(result.category).toBe('groceries');
  });

  it('曖昧な項目はnullと確認対象として保持できる', () => {
    const result = receiptOcrResultSchema.parse({
      amount: null,
      occurredOn: null,
      place: null,
      category: null,
      ambiguousFields: ['amount', 'occurredOn', 'place', 'category'],
      warnings: ['画像が不鮮明です'],
    });

    expect(result.amount).toBeNull();
    expect(result.ambiguousFields).toContain('amount');
  });

  it('収入カテゴリと不正な日付を拒否する', () => {
    const result = receiptOcrResultSchema.safeParse({
      amount: 1000,
      occurredOn: '2026-02-30',
      place: '店舗',
      category: 'salary',
      ambiguousFields: [],
      warnings: [],
    });

    expect(result.success).toBe(false);
  });

  it('金額は正の整数だけを受け入れる', () => {
    expect(
      receiptOcrResultSchema.safeParse({
        amount: -1,
        occurredOn: '2026-08-01',
        place: '店舗',
        category: 'other',
        ambiguousFields: [],
        warnings: [],
      }).success
    ).toBe(false);
  });
});

