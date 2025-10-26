/**
 * 取引カテゴリ定義
 */

import {
  Baby,
  Briefcase,
  BriefcaseMedical,
  Car,
  HandCoins,
  Home,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  UtensilsCrossed,
  MoreHorizontal,
} from 'lucide-react';
import type {
  ExpenseCategoryKey,
  TransactionCategory,
  TransactionCategoryKey,
  TransactionType,
} from '@/types/transaction';

/**
 * カテゴリ定義一覧
 */
export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  {
    key: 'groceries',
    label: '食費',
    icon: ShoppingBasket,
    colorClass: 'text-emerald-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'dining',
    label: '外食費',
    icon: UtensilsCrossed,
    colorClass: 'text-orange-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'daily',
    label: '日用品',
    icon: ShoppingBag,
    colorClass: 'text-sky-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'medical',
    label: '医療費',
    icon: BriefcaseMedical,
    colorClass: 'text-rose-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'home',
    label: '家具・家電',
    icon: Home,
    colorClass: 'text-indigo-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'kids',
    label: '子ども',
    icon: Baby,
    colorClass: 'text-purple-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'transportation',
    label: '交通費',
    icon: Car,
    colorClass: 'text-blue-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'other',
    label: 'その他',
    icon: MoreHorizontal,
    colorClass: 'text-slate-500',
    types: ['expense', 'advance'],
  },
  {
    key: 'salary',
    label: '給料',
    icon: Briefcase,
    colorClass: 'text-emerald-600',
    types: ['income'],
  },
  {
    key: 'sideline',
    label: '副業',
    icon: Briefcase,
    colorClass: 'text-teal-600',
    types: ['income'],
  },
  {
    key: 'windfall',
    label: '臨時収入',
    icon: Sparkles,
    colorClass: 'text-indigo-500',
    types: ['income'],
  },
  {
    key: 'subsidy',
    label: '補助金',
    icon: HandCoins,
    colorClass: 'text-amber-600',
    types: ['income'],
  },
];

/**
 * カテゴリのマップ
 */
export const TRANSACTION_CATEGORY_MAP: Record<TransactionCategoryKey, TransactionCategory> =
  TRANSACTION_CATEGORIES.reduce((acc, category) => {
    acc[category.key] = category;
    return acc;
  }, {} as Record<TransactionCategoryKey, TransactionCategory>);

/**
 * 支出カテゴリごとのチャートカラー
 *
 * 円グラフや棒グラフの色付けに使用する。
 */
export const EXPENSE_CATEGORY_CHART_COLORS: Record<ExpenseCategoryKey, string> = {
  groceries: 'var(--chart-1)',
  dining: 'var(--chart-2)',
  daily: 'var(--chart-3)',
  medical: 'var(--chart-4)',
  home: 'var(--chart-5)',
  kids: 'var(--chart-6)',
  transportation: 'var(--chart-7)',
  other: 'var(--chart-8)',
};

/**
 * 指定タイプのカテゴリ一覧を取得
 * 
 * @param type - 取引タイプ
 * @returns カテゴリ一覧
 */
export function getCategoriesByType(type: TransactionType): TransactionCategory[] {
  return TRANSACTION_CATEGORIES.filter((category) => category.types.includes(type));
}

/**
 * カテゴリを取得
 * 
 * @param key - カテゴリキー
 * @returns カテゴリ情報（見つからない場合は「その他」）
 */
export function getTransactionCategory(
  key: TransactionCategoryKey | null | undefined
): TransactionCategory {
  if (!key || !(key in TRANSACTION_CATEGORY_MAP)) {
    return TRANSACTION_CATEGORY_MAP.other;
  }
  return TRANSACTION_CATEGORY_MAP[key as TransactionCategoryKey];
}
