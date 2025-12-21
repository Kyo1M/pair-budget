/**
 * 全取引表示モーダル
 * 
 * 取引履歴を全件表示します。
 */

'use client';

import { useState } from 'react';
import { X, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Transaction } from '@/types/transaction';
import { getTransactionCategory } from '@/constants/categories';

/**
 * 日付フォーマッター (YYYY/M/D)
 */
const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
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

/**
 * モーダルのプロパティ
 */
interface AllTransactionsModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルの開閉を制御するコールバック */
  onOpenChange: (open: boolean) => void;
  /** 取引一覧 */
  transactions: Transaction[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 表示対象の月 (YYYY-MM形式) */
  selectedMonth?: string;
  /** 編集アクション */
  onEdit?: (transaction: Transaction) => void;
  /** 削除アクション */
  onDelete?: (transaction: Transaction) => void;
}

/**
 * 月表示用フォーマッター (YYYY年M月)
 */
function formatMonthTitle(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return '取引履歴';
  }
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  return `${year}年${monthNum}月の取引`;
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
 * 全取引表示モーダル
 */
export function AllTransactionsModal({
  open,
  onOpenChange,
  transactions,
  isLoading,
  selectedMonth,
  onEdit,
  onDelete,
}: AllTransactionsModalProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');

  // フィルター適用後の取引
  const filteredTransactions =
    filterType === 'all' ? transactions : transactions.filter((t) => t.type === filterType);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {selectedMonth ? formatMonthTitle(selectedMonth) : '取引履歴'}
          </DialogTitle>
          <DialogDescription>
            すべての取引履歴を表示します（{transactions.length}件）
          </DialogDescription>
        </DialogHeader>

        {/* タイプ別フィルター */}
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
          {(['all', 'expense', 'income', 'advance'] as FilterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {getFilterLabel(type)}
            </button>
          ))}
        </div>

        {/* 取引リスト */}
        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
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
              <p className="text-sm text-gray-500">
                {filterType === 'all' ? 'まだ取引が登録されていません' : '該当する取引がありません'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredTransactions.map((transaction) => {
                const category = getTransactionCategory(transaction.category);
                const amountClass = getAmountClasses(transaction.type);
                const amountSign =
                  transaction.type === 'income'
                    ? '+'
                    : transaction.type === 'advance'
                    ? '±'
                    : '-';

                return (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:border-gray-300"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ${category.colorClass} flex-shrink-0`}
                      >
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
                              <X className="h-4 w-4 text-gray-600 rotate-45" />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
