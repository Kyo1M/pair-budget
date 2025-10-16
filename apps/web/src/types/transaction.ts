/**
 * 取引関連の型定義
 */

import type { LucideIcon } from 'lucide-react';

/**
 * 取引タイプ
 */
export type TransactionType = 'expense' | 'income' | 'advance';

/**
 * 取引カテゴリキー一覧
 */
export const TRANSACTION_CATEGORY_KEYS = [
  'groceries',
  'dining',
  'daily',
  'medical',
  'home',
  'kids',
  'other',
] as const;

/**
 * 取引カテゴリキー
 */
export type TransactionCategoryKey = typeof TRANSACTION_CATEGORY_KEYS[number];

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
