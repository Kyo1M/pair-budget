/**
 * カテゴリ別取引履歴モーダル
 * 
 * 指定したカテゴリの取引履歴を表示します。
 */

'use client';

import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
import type { Transaction, ExpenseCategoryKey } from '@/types/transaction';
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
 * モーダルのプロパティ
 */
interface CategoryTransactionsModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルの開閉を制御するコールバック */
  onOpenChange: (open: boolean) => void;
  /** 取引一覧 */
  transactions: Transaction[];
  /** 表示するカテゴリ */
  category: ExpenseCategoryKey;
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
 * カテゴリ別取引履歴モーダル
 */
export function CategoryTransactionsModal({
  open,
  onOpenChange,
  transactions,
  category,
  isLoading,
  onEdit,
  onDelete,
}: CategoryTransactionsModalProps) {
  const categoryInfo = getTransactionCategory(category);

  // 指定カテゴリでフィルタリング
  // カテゴリが設定されている取引のみを対象とし、支出または世帯向け立替（advanceToUserIdがnull）のみを含める
  const filteredTransactions = transactions.filter((transaction) => {
    // カテゴリが一致する
    if (transaction.category !== category) {
      return false;
    }

    // 支出または世帯向け立替のみを含める
    const isExpense = transaction.type === 'expense';
    const isHouseholdAdvance = transaction.type === 'advance' && transaction.advanceToUserId == null;

    return isExpense || isHouseholdAdvance;
  });

  // 合計金額を計算
  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ${categoryInfo.colorClass} flex-shrink-0`}
            >
              <categoryInfo.icon className="h-5 w-5" />
            </div>
            <span>{categoryInfo.label}の利用履歴</span>
          </DialogTitle>
          <DialogDescription>
            {filteredTransactions.length}件の取引 ・ 合計 {currencyFormatter.format(totalAmount)}
          </DialogDescription>
        </DialogHeader>

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
              <p className="text-sm text-gray-500">このカテゴリの取引がまだありません</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredTransactions.map((transaction) => {
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
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {transaction.note || categoryInfo.label}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span>{dateFormatter.format(new Date(transaction.occurredOn))}</span>
                          <span>•</span>
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
                              <MoreHorizontal className="h-4 w-4 text-gray-600" />
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
