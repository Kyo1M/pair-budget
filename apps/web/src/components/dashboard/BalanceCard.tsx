/**
 * 立替残高カード
 * 
 * 世帯内の立替残高を表示します。
 */

'use client';

import { PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HouseholdBalance } from '@/types/settlement';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

/**
 * 立替残高カードのプロパティ
 */
interface BalanceCardProps {
  /** 残高一覧 */
  balances: HouseholdBalance[];
  /** 現在のユーザーID */
  currentUserId?: string;
  /** ローディング状態 */
  isLoading: boolean;
}

/**
 * 残高金額に応じた表示色を取得
 */
function getBalanceClasses(amount: number): string {
  if (amount > 0) {
    return 'text-emerald-600';
  }
  if (amount < 0) {
    return 'text-rose-600';
  }
  return 'text-gray-500';
}

/**
 * 立替残高カードコンポーネント
 */
export function BalanceCard({ balances, currentUserId, isLoading }: BalanceCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>立替残高</CardTitle>
          <p className="text-sm text-gray-500">
            プラスは受け取る金額、マイナスは支払う金額です
          </p>
        </div>
        <PiggyBank className="h-6 w-6 text-amber-500" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border border-dashed p-3">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : balances.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだ立替のやり取りはありません
          </p>
        ) : (
          <ul className="space-y-3">
            {balances.map((balance) => {
              const isCurrentUser = balance.userId === currentUserId;
              const displayName =
                balance.userName ||
                (isCurrentUser ? 'あなた' : '名前未設定');
              const amountClass = getBalanceClasses(balance.balanceAmount);

              return (
                <li
                  key={balance.userId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isCurrentUser ? 'border-blue-200 bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {displayName}
                      {isCurrentUser && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          あなた
                        </span>
                      )}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${amountClass}`}>
                    {currencyFormatter.format(balance.balanceAmount)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
