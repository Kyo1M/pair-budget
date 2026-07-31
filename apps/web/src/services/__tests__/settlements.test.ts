import { describe, expect, it } from 'vitest';
import { groupBalanceBreakdowns } from '@/services/settlements';

describe('groupBalanceBreakdowns', () => {
  it('世帯向け残高と家族間残高を混ぜず、合計だけを集約する', () => {
    const result = groupBalanceBreakdowns([
      {
        subject_user_id: 'user-a',
        subject_user_name: '太郎',
        counterparty_user_id: null,
        counterparty_user_name: null,
        balance_amount: 90000,
        is_over_settled: false,
      },
      {
        subject_user_id: 'user-a',
        subject_user_name: '太郎',
        counterparty_user_id: 'user-b',
        counterparty_user_name: '花子',
        balance_amount: 4000,
        is_over_settled: false,
      },
      {
        subject_user_id: 'user-b',
        subject_user_name: '花子',
        counterparty_user_id: 'user-a',
        counterparty_user_name: '太郎',
        balance_amount: -4000,
        is_over_settled: false,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].balanceAmount).toBe(94000);
    expect(result[0].breakdowns).toEqual([
      expect.objectContaining({ counterpartyUserId: null, balanceAmount: 90000 }),
      expect.objectContaining({ counterpartyUserId: 'user-b', balanceAmount: 4000 }),
    ]);
    expect(result[1].balanceAmount).toBe(-4000);
  });
});
