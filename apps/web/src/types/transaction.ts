/**
 * 取引関連の型定義
 */

import type { LucideIcon } from 'lucide-react';

/**
 * 取引タイプ
 */
export type TransactionType = 'expense' | 'income' | 'advance';

/**
 * 支出カテゴリキー一覧
 */
export const EXPENSE_CATEGORY_KEYS = [
  'groceries',
  'dining',
  'daily',
  'medical',
  'home',
  'kids',
  'other',
] as const;

/**
 * 収入カテゴリキー一覧
 */
export const INCOME_CATEGORY_KEYS = [
  'salary',
  'windfall',
  'subsidy',
] as const;

/**
 * 立替カテゴリキー一覧（支出カテゴリを流用）
 */
export const ADVANCE_CATEGORY_KEYS = EXPENSE_CATEGORY_KEYS;

/**
 * すべてのカテゴリキー一覧
 */
export const TRANSACTION_CATEGORY_KEYS = [
  ...EXPENSE_CATEGORY_KEYS,
  ...INCOME_CATEGORY_KEYS,
] as const;

/**
 * 支出カテゴリキー
 */
export type ExpenseCategoryKey = typeof EXPENSE_CATEGORY_KEYS[number];

/**
 * 収入カテゴリキー
 */
export type IncomeCategoryKey = typeof INCOME_CATEGORY_KEYS[number];

/**
 * 立替カテゴリキー
 */
export type AdvanceCategoryKey = typeof ADVANCE_CATEGORY_KEYS[number];

/**
 * 取引カテゴリキー
 */
export type TransactionCategoryKey =
  | ExpenseCategoryKey
  | IncomeCategoryKey
  | AdvanceCategoryKey;

/**
 * 取引カテゴリ情報
 */
export interface TransactionCategory {
  /** カテゴリキー */
  key: TransactionCategoryKey;
  /** 表示名 */
  label: string;
  /** 表示に使用するアイコンのReactコンポーネント */
  icon: LucideIcon;
  /** UI上のカラークラス */
  colorClass: string;
  /** 適用可能な取引タイプ */
  types: ReadonlyArray<TransactionType>;
}

/**
 * 取引作成時の入力データ
 */
export interface TransactionData {
  /** 世帯ID */
  householdId: string;
  /** 取引タイプ */
  type: TransactionType;
  /** 金額 */
  amount: number;
  /** 発生日 (YYYY-MM-DD) */
  occurredOn: string;
  /** カテゴリキー */
  category: TransactionCategoryKey;
  /** メモ */
  note?: string | null;
  /** 支払者ユーザーID */
  payerUserId?: string | null;
  /** 立替先ユーザーID */
  advanceToUserId?: string | null;
}

/**
 * 取引情報
 */
export interface Transaction {
  /** 取引ID */
  id: string;
  /** 世帯ID */
  householdId: string;
  /** 取引タイプ */
  type: TransactionType;
  /** 金額 */
  amount: number;
  /** 発生日 */
  occurredOn: string;
  /** カテゴリキー */
  category: TransactionCategoryKey | null;
  /** メモ */
  note: string | null;
  /** 支払者ユーザーID */
  payerUserId: string | null;
  /** 立替先ユーザーID */
  advanceToUserId: string | null;
  /** 作成者ユーザーID */
  createdBy: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/**
 * 月次サマリー
 */
export interface MonthlySummary {
  /** 収入合計 */
  incomeTotal: number;
  /** 支出合計 */
  expenseTotal: number;
  /** 差額 (収入 - 支出) */
  balance: number;
}
