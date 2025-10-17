/**
 * 精算関連のバリデーションスキーマ
 */

import { z } from 'zod';

export const HOUSEHOLD_SETTLEMENT_KEY = '__household__';

const settlementDirectionEnum = z.enum(['pay', 'receive']);
const partnerSelectionSchema = z.union([
  z.literal(HOUSEHOLD_SETTLEMENT_KEY),
  z.string().uuid('相手を選択してください'),
]);

/**
 * YYYY-MM-DD 形式の妥当性確認
 */
function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * 精算フォームのスキーマ
 */
export const settlementSchema = z.object({
  /** 精算方向 */
  direction: settlementDirectionEnum,
  /** 相手ユーザーID */
  partnerUserId: partnerSelectionSchema,
  /** 金額 */
  amount: z.coerce
    .number({
      invalid_type_error: '金額を数値で入力してください',
    })
    .positive('金額は1円以上で入力してください'),
  /** 精算日 */
  settledOn: z
    .string()
    .min(1, '精算日を入力してください')
    .refine(isValidDate, '有効な日付を YYYY-MM-DD 形式で入力してください'),
  /** メモ */
  note: z
    .string()
    .max(200, 'メモは200文字以内で入力してください')
    .optional()
    .nullable(),
});

export type SettlementFormData = z.infer<typeof settlementSchema>;
