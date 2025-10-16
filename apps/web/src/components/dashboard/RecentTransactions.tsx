/**
 * 最近の取引リスト
 * 
 * 最新の取引を一覧表示します。
 */

'use client';

import { ArrowRight, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/types/transaction';
import { getTransactionCategory } from '@/constants/categories';

/**
 * 日付フォーマッター (M/D)
 */
const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
});

/**
 * 金額フォーマッター
 */
const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

/**
 * 最近の取引リストのプロパティ
 */
interface RecentTransactionsProps {
  /** 取引一覧 */
  transactions: Transaction[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 詳細表示アクション */
  onViewAll?: () => void;
}

/**
 * 取引種別に応じた表示色を取得
 */
function getAmountClasses(type: Transaction['type']): string {
  switch (type) {
    case 'income':
      return 'text-emerald-600';
    case 'advance':
      return 'text-amber-600';
    case 'expense':
    default:
      return 'text-rose-600';
  }
}

/**
 * 取引種別ラベル
 */
function getTypeLabel(type: Transaction['type']): string {
  switch (type) {
    case 'income':
      return '収入';
    case 'advance':
      return '立替';
    case 'expense':
    default:
      return '支出';
  }
}

/**
 * 最近の取引リストコンポーネント
 */
export function RecentTransactions({
  transactions,
  isLoading,
  onViewAll,
}: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>最近の取引</CardTitle>
          <p className="text-sm text-gray-500">
            最新の5件を表示しています
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                  <div>
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="mt-1 h-3 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-8 text-center">
            <CalendarDays className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              まだ取引が登録されていません
            </p>
            <p className="text-xs text-gray-400">右下の + ボタンから取引を追加しましょう</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {transactions.map((transaction) => {
              const category = getTransactionCategory(transaction.category);
              const amountClass = getAmountClasses(transaction.type);
              const amountSign =
                transaction.type === 'income' ? '+' : transaction.type === 'advance' ? '±' : '-';

              return (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:border-gray-300"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ${category.colorClass}`}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {transaction.note || category.label}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{dateFormatter.format(new Date(transaction.occurredOn))}</span>
                        <span>•</span>
                        <span>{category.label}</span>
                        <span
                          className={`rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium ${amountClass.replace('text', 'bg').replace('-600', '-100')}`}
                        >
                          {getTypeLabel(transaction.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${amountClass}`}>
                    {amountSign}
                    {currencyFormatter.format(transaction.amount)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          onClick={onViewAll}
          disabled={!onViewAll}
        >
          すべて表示
          <ArrowRight className="h-4 w-4" />
        </button>
      </CardFooter>
    </Card>
  );
}
