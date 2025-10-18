/**
 * ダッシュボード集計ユーティリティ
 *
 * 月次の支出カテゴリ内訳などを計算します。
 */

import { getTransactionCategory } from '@/constants/categories';
import {
  EXPENSE_CATEGORY_KEYS,
  type ExpenseCategoryKey,
  type Transaction,
  type TransactionCategory,
} from '@/types/transaction';

/**
 * 支出カテゴリ内訳のエントリ
 */
export interface ExpenseCategoryBreakdownItem {
  /** カテゴリキー */
  key: ExpenseCategoryKey;
  /** カテゴリ情報 */
  category: TransactionCategory;
  /** 支出合計 */
  amount: number;
  /** 全体に対する割合 (0〜1) */
  ratio: number;
}

/**
 * 支出カテゴリ内訳のオプション
 */
interface ExpenseCategoryBreakdownOptions {
  /**
   * 立替取引 (advance) を集計に含めるかどうか。
   * デフォルトでは家庭向け立替 (advanceToUserId が null) を含め、
   * 個別の立替は除外する。
   */
  includeAdvance?: boolean;
}

/**
 * 月次の支出カテゴリ内訳を計算
 *
 * @param transactions - 対象取引一覧
 * @param options - 集計オプション
 * @returns 内訳エントリと総額
 */
export function calculateExpenseCategoryBreakdown(
  transactions: Transaction[],
  options: ExpenseCategoryBreakdownOptions = {}
): {
  total: number;
  items: ExpenseCategoryBreakdownItem[];
} {
  const { includeAdvance = false } = options;

  const totals = transactions.reduce<Record<ExpenseCategoryKey, number>>((acc, transaction) => {
    const isExpense = transaction.type === 'expense';
    const isHouseholdAdvance =
      transaction.type === 'advance' && transaction.advanceToUserId == null;
    const isOtherAdvance =
      transaction.type === 'advance' && transaction.advanceToUserId != null;
    const shouldInclude = isExpense || isHouseholdAdvance || (includeAdvance && isOtherAdvance);

    if (!shouldInclude) {
      return acc;
    }

    if (transaction.category == null) {
      return acc;
    }

    const category = getTransactionCategory(transaction.category);
    if (!isExpenseCategory(category.key)) {
      return acc;
    }

    acc[category.key] = (acc[category.key] ?? 0) + transaction.amount;
    return acc;
  }, {} as Record<ExpenseCategoryKey, number>);

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return {
      total: 0,
      items: [],
    };
  }

  const items = Object.entries(totals)
    .map(([key, amount]) => {
      const expenseKey = key as ExpenseCategoryKey;
      const category = getTransactionCategory(expenseKey);
      return {
        key: expenseKey,
        category,
        amount,
        ratio: amount / total,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    total,
    items,
  };
}

/**
 * カテゴリが支出カテゴリかどうか
 */
const EXPENSE_CATEGORY_SET = new Set<ExpenseCategoryKey>(EXPENSE_CATEGORY_KEYS);

function isExpenseCategory(key: string): key is ExpenseCategoryKey {
  return EXPENSE_CATEGORY_SET.has(key as ExpenseCategoryKey);
}
