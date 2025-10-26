/**
 * 定期支出のバリデーションスキーマ
 */

import { z } from 'zod';
import type { RecurringExpenseData } from '@/types/transaction';

/**
 * 定期支出作成・更新用のバリデーションスキーマ
 */
export const recurringExpenseSchema = z.object({
  householdId: z.string().uuid('世帯IDが正しくありません'),
  amount: z
    .number({ required_error: '金額を入力してください' })
    .positive('金額は正の数である必要があります')
    .max(999999999.99, '金額が大きすぎます'),
  dayOfMonth: z
    .number({ required_error: '支払日を選択してください' })
    .int('支払日は整数である必要があります')
    .min(1, '支払日は1日以上である必要があります')
    .max(31, '支払日は31日以下である必要があります'),
  category: z.enum(['groceries', 'dining', 'daily', 'medical', 'home', 'kids', 'transportation', 'fixed', 'other'], {
    required_error: 'カテゴリを選択してください',
  }),
  note: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
  payerUserId: z.string().uuid('支払者が正しくありません'),
  isActive: z.boolean().optional().default(true),
});

/**
 * 定期支出フォームデータの型
 */
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;

/**
 * 定期支出データをフォームデータに変換
 * 
 * @param data - 定期支出データ
 * @returns フォームデータ
 */
export function toRecurringExpenseFormData(data: RecurringExpenseData): RecurringExpenseFormData {
  return {
    householdId: data.householdId,
    amount: data.amount,
    dayOfMonth: data.dayOfMonth,
    category: data.category,
    note: data.note ?? undefined,
    payerUserId: data.payerUserId,
    isActive: data.isActive ?? true,
  };
}

/**
 * フォームデータを定期支出データに変換
 * 
 * @param formData - フォームデータ
 * @returns 定期支出データ
 */
export function toRecurringExpenseData(formData: RecurringExpenseFormData): RecurringExpenseData {
  return {
    householdId: formData.householdId,
    amount: formData.amount,
    dayOfMonth: formData.dayOfMonth,
    category: formData.category,
    note: formData.note ?? null,
    payerUserId: formData.payerUserId,
    isActive: formData.isActive,
  };
}
