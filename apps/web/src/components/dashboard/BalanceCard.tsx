/** 相手別の立替残高カード */

'use client';

import { PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HouseholdBalance, HouseholdBalanceBreakdown } from '@/types/settlement';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

export interface SettlementTarget {
  subjectUserId: string;
  counterpartyUserId: string | null;
}

interface BalanceCardProps {
  balances: HouseholdBalance[];
  currentUserId?: string;
  isLoading: boolean;
  highlights?: Record<string, boolean>;
  onSelectSettlementTarget?: (target: SettlementTarget) => void;
}

function getBalanceClasses(amount: number): string {
  if (amount > 0) return 'text-emerald-600';
  if (amount < 0) return 'text-rose-600';
  return 'text-gray-500';
}

function getMemberName(detail: HouseholdBalanceBreakdown, currentUserId?: string): string {
  if (detail.subjectUserId === currentUserId) return `${detail.subjectUserName || 'あなた'}（あなた）`;
  return detail.subjectUserName || '名前未設定';
}

export function BalanceCard({
  balances,
  currentUserId,
  isLoading,
  highlights,
  onSelectSettlementTarget,
}: BalanceCardProps) {
  const allDetails = balances.flatMap((balance) => balance.breakdowns);
  const quickTarget =
    allDetails.find(
      (detail) => detail.subjectUserId === currentUserId && detail.counterpartyUserId === null
    ) ?? allDetails.find((detail) => detail.counterpartyUserId === null) ?? allDetails[0];

  const openSettlement = (detail: HouseholdBalanceBreakdown) => {
    onSelectSettlementTarget?.({
      subjectUserId: detail.subjectUserId,
      counterpartyUserId: detail.counterpartyUserId,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>立替残高</CardTitle>
          <p className="text-sm text-gray-500">プラスは受け取る、マイナスは支払う金額です</p>
        </div>
        <div className="flex items-center gap-2">
          {quickTarget && onSelectSettlementTarget && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => openSettlement(quickTarget)}>
              精算する
            </Button>
          )}
          <PiggyBank className="h-6 w-6 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-lg border bg-gray-100" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <p className="text-sm text-gray-500">未精算の立替はありません</p>
        ) : (
          <ul className="space-y-4">
            {balances.map((balance) => (
              <li
                key={balance.userId}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  balance.userId === currentUserId && 'border-blue-200 bg-blue-50',
                  highlights?.[balance.userId] && 'border-amber-200 bg-amber-50 ring-2 ring-amber-200'
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {balance.breakdowns[0]
                      ? getMemberName(balance.breakdowns[0], currentUserId)
                      : balance.userName || '名前未設定'}
                  </p>
                  <strong className={getBalanceClasses(balance.balanceAmount)}>
                    {currencyFormatter.format(balance.balanceAmount)}
                  </strong>
                </div>
                <ul className="space-y-2">
                  {balance.breakdowns.map((detail) => {
                    const counterparty = detail.counterpartyUserId
                      ? detail.counterpartyUserName || '名前未設定'
                      : '世帯全体';
                    return (
                      <li key={`${detail.subjectUserId}:${detail.counterpartyUserId ?? 'household'}`}>
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          onClick={() => openSettlement(detail)}
                          disabled={!onSelectSettlementTarget}
                        >
                          <span>
                            {counterparty}
                            <span className="ml-1 text-xs text-gray-500">
                              {detail.balanceAmount > 0 ? 'から受け取る' : 'へ支払う'}
                            </span>
                            {detail.isOverSettled && (
                              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                                過剰精算の可能性
                              </span>
                            )}
                          </span>
                          <span className={cn('font-semibold', getBalanceClasses(detail.balanceAmount))}>
                            {currencyFormatter.format(detail.balanceAmount)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
