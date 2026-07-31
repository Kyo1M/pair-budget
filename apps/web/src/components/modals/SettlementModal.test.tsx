import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettlementModal } from './SettlementModal';

const mocks = vi.hoisted(() => ({ settleBalance: vi.fn() }));

const balances = [
  {
    userId: 'user-a',
    userName: '太郎',
    balanceAmount: 94000,
    breakdowns: [
      {
        subjectUserId: 'user-a',
        subjectUserName: '太郎',
        counterpartyUserId: null,
        counterpartyUserName: null,
        balanceAmount: 90000,
        isOverSettled: false,
      },
      {
        subjectUserId: 'user-a',
        subjectUserName: '太郎',
        counterpartyUserId: 'user-b',
        counterpartyUserName: '花子',
        balanceAmount: 4000,
        isOverSettled: false,
      },
    ],
  },
  {
    userId: 'user-b',
    userName: '花子',
    balanceAmount: 10000,
    breakdowns: [
      {
        subjectUserId: 'user-b',
        subjectUserName: '花子',
        counterpartyUserId: null,
        counterpartyUserName: null,
        balanceAmount: 10000,
        isOverSettled: false,
      },
    ],
  },
];

vi.mock('@/store/useSettlementStore', () => ({
  useSettlementStore: (selector: (state: unknown) => unknown) =>
    selector({ balances, settleBalance: mocks.settleBalance, isSubmitting: false }),
}));

vi.mock('@/lib/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: vi.fn() }));

describe('SettlementModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settleBalance.mockResolvedValue({});
  });

  it('家族本人でなくても、その家族の世帯向け残高だけを精算できる', async () => {
    render(
      <SettlementModal
        open
        onOpenChange={vi.fn()}
        householdId="household-1"
        initialSubjectUserId="user-b"
        initialCounterpartyUserId={null}
      />
    );

    expect(screen.getByLabelText('精算する残高')).toHaveValue('user-b:__household__');
    expect(screen.getByLabelText('受け渡した金額')).toHaveValue('10000');
    expect(screen.getByText('世帯全体から花子が受け取る精算です。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '精算を記録' }));
    await waitFor(() =>
      expect(mocks.settleBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectUserId: 'user-b',
          counterpartyUserId: null,
          amount: 10000,
        })
      )
    );
  });

  it('世帯向け90,000円と家族間4,000円を別の選択肢として表示する', () => {
    render(
      <SettlementModal
        open
        onOpenChange={vi.fn()}
        householdId="household-1"
        initialSubjectUserId="user-a"
        initialCounterpartyUserId={null}
      />
    );
    expect(screen.getByLabelText('受け渡した金額')).toHaveValue('90000');
    expect(screen.getByRole('option', { name: /太郎 × 花子/ })).toHaveTextContent('￥4,000');
  });
});
