/**
 * ダッシュボード集計ユーティリティ
 *
 * 月次の支出カテゴリ内訳などを計算します。
 */

import { getTransactionCategory } from "@/constants/categories";
import {
  EXPENSE_CATEGORY_KEYS,
  type ExpenseCategoryKey,
  type MonthlySummary,
  type Transaction,
  type TransactionCategory,
} from "@/types/transaction";

/**
 * 取引が「家計の支出」に該当するか判定する。
 *
 * このアプリの会計モデル（家計が主体）に基づく:
 * - 支出 (expense) は家計の支出。
 * - 世帯向け立替 (advance かつ advanceToUserId == null) は実際の家計の支出なので含める。
 * - 個人向け立替 (advance かつ advanceToUserId != null) は個人間の貸付であり、
 *   家計の共通支出ではないため支出には含めない（残高・精算でのみ扱う）。
 *
 * @param transaction - 対象取引
 * @returns 家計の支出に含めるべきなら true
 */
export function isHouseholdExpense(transaction: Transaction): boolean {
  if (transaction.type === "expense") {
    return true;
  }
  if (transaction.type === "advance" && transaction.advanceToUserId == null) {
    return true;
  }
  return false;
}

/**
 * 取引一覧から収支サマリー（収入合計・支出合計・差額）を計算する。
 *
 * 会計モデルに従い、収入は収入合計へ、家計の支出（支出＋世帯向け立替）は支出合計へ計上し、
 * 個人向け立替は除外する。月次・年次サマリーで共有する単一の集計ロジック。
 *
 * @param transactions - 対象取引一覧
 * @returns 収支サマリー
 */
export function calculateTransactionSummary(
  transactions: Transaction[],
): MonthlySummary {
  const summary = transactions.reduce<MonthlySummary>(
    (acc, transaction) => {
      if (transaction.type === "income") {
        acc.incomeTotal += transaction.amount;
      } else if (isHouseholdExpense(transaction)) {
        acc.expenseTotal += transaction.amount;
      }
      // 個人向け立替 (advanceToUserId != null) は家計の支出ではないため集計しない
      return acc;
    },
    { incomeTotal: 0, expenseTotal: 0, balance: 0 },
  );

  summary.balance = summary.incomeTotal - summary.expenseTotal;
  return summary;
}

/**
 * 支出カテゴリ内訳のエントリ
 */
export type ExpenseBreakdownKey = ExpenseCategoryKey | "uncategorized";

export function getExpenseBreakdownKey(
  transaction: Transaction,
): ExpenseBreakdownKey {
  return transaction.category && isExpenseCategory(transaction.category)
    ? transaction.category
    : "uncategorized";
}

export function getExpenseBreakdownCategory(
  key: ExpenseBreakdownKey,
): TransactionCategory {
  return key === "uncategorized"
    ? { ...getTransactionCategory("other"), label: "未分類" }
    : getTransactionCategory(key);
}

export interface ExpenseCategoryBreakdownItem {
  /** カテゴリキー */
  key: ExpenseBreakdownKey;
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
  options: ExpenseCategoryBreakdownOptions = {},
): {
  total: number;
  items: ExpenseCategoryBreakdownItem[];
} {
  const { includeAdvance = false } = options;

  const totals = transactions.reduce<
    Partial<Record<ExpenseBreakdownKey, number>>
  >((acc, transaction) => {
    const isExpense = transaction.type === "expense";
    const isHouseholdAdvance =
      transaction.type === "advance" && transaction.advanceToUserId == null;
    const isOtherAdvance =
      transaction.type === "advance" && transaction.advanceToUserId != null;
    const shouldInclude =
      isExpense || isHouseholdAdvance || (includeAdvance && isOtherAdvance);

    if (!shouldInclude) {
      return acc;
    }

    const key = getExpenseBreakdownKey(transaction);
    acc[key] = (acc[key] ?? 0) + transaction.amount;
    return acc;
  }, {});

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return {
      total: 0,
      items: [],
    };
  }

  const items = Object.entries(totals)
    .map(([key, amount]) => {
      const expenseKey = key as ExpenseBreakdownKey;
      const category = getExpenseBreakdownCategory(expenseKey);
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
