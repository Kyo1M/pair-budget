/**
 * 定期収入のバリデーションスキーマ
 */

import { z } from 'zod';
import type { RecurringIncomeData, RecurringIncome } from '@/types/transaction';

/**
 * 定期収入作成・更新用のバリデーションスキーマ
 */
export const recurringIncomeSchema = z.object({
  householdId: z.string().uuid('世帯IDが正しくありません'),
  amount: z
    .number({ message: '金額を入力してください' })
    .positive('金額は正の数である必要があります')
    .max(999999999.99, '金額が大きすぎます'),
  dayOfMonth: z
    .number({ message: '受取日を選択してください' })
    .int('受取日は整数である必要があります')
    .min(1, '受取日は1日以上である必要があります')
    .max(31, '受取日は31日以下である必要があります'),
  category: z.enum(['salary', 'sideline', 'windfall', 'subsidy'], {
    message: 'カテゴリを選択してください',
  }),
  note: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
  recipientUserId: z.string().uuid('受取者が正しくありません'),
  isActive: z.boolean().optional().default(true),
});

/**
 * 定期収入フォームデータの型
 */
export type RecurringIncomeFormData = z.infer<typeof recurringIncomeSchema>;

/**
 * 定期収入データをフォームデータに変換
 *
 * @param data - 定期収入データ
 * @returns フォームデータ
 */
export function toRecurringIncomeFormData(data: RecurringIncome): RecurringIncomeFormData {
  return {
    householdId: data.householdId,
    amount: data.amount,
    dayOfMonth: data.dayOfMonth,
    category: data.category,
    note: data.note ?? undefined,
    recipientUserId: data.recipientUserId,
    isActive: data.isActive ?? true,
  };
}

/**
 * フォームデータを定期収入データに変換
 *
 * @param formData - フォームデータ
 * @returns 定期収入データ
 */
export function toRecurringIncomeData(formData: RecurringIncomeFormData): RecurringIncomeData {
  return {
    householdId: formData.householdId,
    amount: formData.amount,
    dayOfMonth: formData.dayOfMonth,
    category: formData.category,
    note: formData.note ?? null,
    recipientUserId: formData.recipientUserId,
    isActive: formData.isActive,
  };
}
