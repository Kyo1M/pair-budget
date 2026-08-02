import { describe, expect, it } from 'vitest';
import { transactionSchema } from '@/lib/validations/transaction';

const base = {
  type: 'expense' as const,
  amount: 1000,
  occurredOn: '2026-06-03',
  category: 'groceries',
  isHouseholdAdvance: false,
  payerUserId: '00000000-0000-4000-8000-000000000001',
  advanceToUserId: null,
};

describe('transactionSchema の place', () => {
  it('place 未指定でも通る', () => {
    const result = transactionSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('50文字以内の place は通る', () => {
    const result = transactionSchema.safeParse({ ...base, place: 'スーパー' });
    expect(result.success).toBe(true);
  });

  it('50文字超の place は弾く', () => {
    const result = transactionSchema.safeParse({ ...base, place: 'あ'.repeat(51) });
    expect(result.success).toBe(false);
  });
});
