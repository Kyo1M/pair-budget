/**
 * 取引カテゴリ定義
 */

import {
  Baby,
  BriefcaseMedical,
  Home,
  ShoppingBag,
  ShoppingBasket,
  UtensilsCrossed,
  MoreHorizontal,
} from 'lucide-react';
import type { TransactionCategory, TransactionCategoryKey } from '@/types/transaction';

/**
 * カテゴリ定義一覧
 */
export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  {
    key: 'groceries',
    label: '食費',
    icon: ShoppingBasket,
    colorClass: 'text-emerald-500',
  },
  {
    key: 'dining',
    label: '外食費',
    icon: UtensilsCrossed,
    colorClass: 'text-orange-500',
  },
  {
    key: 'daily',
    label: '日用品',
    icon: ShoppingBag,
    colorClass: 'text-sky-500',
  },
  {
    key: 'medical',
    label: '医療費',
    icon: BriefcaseMedical,
    colorClass: 'text-rose-500',
  },
  {
    key: 'home',
    label: '家具・家電',
    icon: Home,
    colorClass: 'text-indigo-500',
  },
  {
    key: 'kids',
    label: '子ども',
    icon: Baby,
    colorClass: 'text-purple-500',
  },
  {
    key: 'other',
    label: 'その他',
    icon: MoreHorizontal,
    colorClass: 'text-slate-500',
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
