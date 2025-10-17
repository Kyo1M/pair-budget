/**
 * 立替残高カード
 *
 * 各メンバーの残高と精算ショートカットを表示します。
 */

'use client';

import { PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HOUSEHOLD_SETTLEMENT_KEY } from '@/lib/validations/settlement';
import type { HouseholdBalance } from '@/types/settlement';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

interface BalanceCardProps {
  balances: HouseholdBalance[];
  currentUserId?: string;
  isLoading: boolean;
  highlights?: Record<string, boolean>;
  onSelectSettlementTarget?: (params: {
    partnerId: string;
    suggestedDirection: 'pay' | 'receive';
  }) => void;
}

function getBalanceClasses(amount: number): string {
  if (amount > 0) {
    return 'text-emerald-600';
  }
  if (amount < 0) {
    return 'text-rose-600';
  }
  return 'text-gray-500';
}

export function BalanceCard({
  balances,
  currentUserId,
  isLoading,
  highlights,
  onSelectSettlementTarget,
}: BalanceCardProps) {
  const currentUserBalance =
    currentUserId != null
      ? balances.find((balance) => balance.userId === currentUserId)?.balanceAmount ?? 0
      : 0;

  const handleHouseholdSettlement = () => {
    if (!onSelectSettlementTarget) {
      return;
    }
    onSelectSettlementTarget({
      partnerId: HOUSEHOLD_SETTLEMENT_KEY,
      suggestedDirection: currentUserBalance < 0 ? 'pay' : 'receive',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>立替残高</CardTitle>
          <p className="text-sm text-gray-500">
            プラスは受け取る金額、マイナスは支払う金額です
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSelectSettlementTarget && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHouseholdSettlement}
            >
              世帯精算
            </Button>
          )}
          <PiggyBank className="h-6 w-6 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-dashed p-3"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : balances.length === 0 ? (
          <p className="text-sm text-gray-500">まだ立替のやり取りはありません</p>
        ) : (
          <ul className="space-y-3">
            {balances.map((balance) => {
              const isCurrentUser = balance.userId === currentUserId;
              const isHighlighted = !!highlights?.[balance.userId ?? ''];
              const displayName =
                balance.userName || (isCurrentUser ? 'あなた' : '名前未設定');
              const amountClass = getBalanceClasses(balance.balanceAmount);

              const canSelect =
                !!onSelectSettlementTarget && !!balance.userId && !isCurrentUser;

              const buttonClassName = cn(
                'w-full rounded-lg border p-3 text-left ring-0 transition-colors duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-default disabled:opacity-95',
                canSelect && 'cursor-pointer hover:border-blue-200 hover:bg-blue-50',
                isCurrentUser && 'border-blue-200 bg-blue-50',
                isHighlighted && 'border-amber-200 bg-amber-50 ring-2 ring-amber-200'
              );

              return (
                <li key={balance.userId ?? displayName}>
                  <button
                    type="button"
                    className={buttonClassName}
                    disabled={!canSelect}
                    onClick={() => {
                      if (!onSelectSettlementTarget || !balance.userId) {
                        return;
                      }
                      onSelectSettlementTarget({
                        partnerId: balance.userId,
                        suggestedDirection:
                          balance.balanceAmount > 0
                            ? 'receive'
                            : balance.balanceAmount < 0
                              ? 'pay'
                              : 'receive',
                      });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {displayName}
                          {isCurrentUser && (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                              あなた
                            </span>
                          )}
                        </p>
                        {canSelect && (
                          <p className="mt-1 text-xs text-blue-600">
                            {balance.balanceAmount > 0
                              ? 'この相手から精算を受け取る'
                              : balance.balanceAmount < 0
                                ? 'この相手へ精算を支払う'
                                : '精算を記録'}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          'text-sm font-semibold transition-all duration-500',
                          amountClass
                        )}
                      >
                        {currencyFormatter.format(balance.balanceAmount)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
