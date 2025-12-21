/**
 * 最近の取引リスト
 * 
 * 最新の取引を一覧表示します。
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CalendarDays, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
 * フィルタータイプ
 */
type FilterType = 'all' | Transaction['type'];

/** デフォルトの表示件数 */
const DEFAULT_DISPLAY_LIMIT = 10;

/**
 * 最近の取引リストのプロパティ
 */
interface RecentTransactionsProps {
  /** 取引一覧 */
  transactions: Transaction[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 編集アクション */
  onEdit?: (transaction: Transaction) => void;
  /** 削除アクション */
  onDelete?: (transaction: Transaction) => void;
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
  onEdit,
  onDelete,
}: RecentTransactionsProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  // フィルター適用後の取引
  const filteredTransactions =
    filterType === 'all' ? transactions : transactions.filter((t) => t.type === filterType);

  // 展開状態に応じて表示件数を決定
  const displayedTransactions = isExpanded
    ? filteredTransactions
    : filteredTransactions.slice(0, DEFAULT_DISPLAY_LIMIT);

  // 残りの取引件数
  const remainingCount = filteredTransactions.length - DEFAULT_DISPLAY_LIMIT;

  // タイプ別フィルターのラベル
  const getFilterLabel = (type: FilterType): string => {
    switch (type) {
      case 'all':
        return 'すべて';
      case 'expense':
        return '支出';
      case 'income':
        return '収入';
      case 'advance':
        return '立替';
      default:
        return 'すべて';
    }
  };

  // フィルター変更ハンドラ（展開状態をリセット）
  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
    setIsExpanded(false);
  };

  // 展開/折りたたみトグル
  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>最近の取引</CardTitle>
          <p className="text-sm text-gray-500">
            {isExpanded
              ? `全${filteredTransactions.length}件を表示中`
              : remainingCount > 0
                ? `最新の${DEFAULT_DISPLAY_LIMIT}件を表示（他${remainingCount}件）`
                : `${filteredTransactions.length}件の取引`}
          </p>
        </div>
        {/* タイプ別フィルター */}
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
          {(['all', 'expense', 'income', 'advance'] as FilterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleFilterChange(type)}
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {getFilterLabel(type)}
            </button>
          ))}
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
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-8 text-center">
            <CalendarDays className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {filterType === 'all' ? 'まだ取引が登録されていません' : '該当する取引がありません'}
            </p>
            <p className="text-xs text-gray-400">右下の + ボタンから取引を追加しましょう</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {displayedTransactions.map((transaction) => {
              const category = getTransactionCategory(transaction.category);
              const amountClass = getAmountClasses(transaction.type);
              const amountSign =
                transaction.type === 'income' ? '+' : transaction.type === 'advance' ? '±' : '-';

              return (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:border-gray-300"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ${category.colorClass} flex-shrink-0`}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {transaction.note || category.label}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`text-sm font-semibold ${amountClass}`}>
                      {amountSign}
                      {currencyFormatter.format(transaction.amount)}
                    </div>
                    {(onEdit || onDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(transaction);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              編集
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(transaction);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              削除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {remainingCount > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            onClick={handleToggleExpand}
          >
            {isExpanded ? (
              <>
                折りたたむ
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                他{remainingCount}件を表示
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </CardFooter>
    </Card>
  );
}
