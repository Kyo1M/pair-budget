/**
 * 取引関連のバリデーションスキーマ
 */

import { z } from 'zod';
import {
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
  TRANSACTION_CATEGORY_KEYS,
  type TransactionData,
  type TransactionCategoryKey,
  type TransactionType,
} from '@/types/transaction';

const TRANSACTION_TYPE_VALUES = ['expense', 'income', 'advance'] as const satisfies readonly TransactionType[];

const transactionTypeEnum = z.enum(TRANSACTION_TYPE_VALUES);

const CATEGORY_ENUM_VALUES = [...TRANSACTION_CATEGORY_KEYS] as [
  TransactionCategoryKey,
  ...TransactionCategoryKey[]
];

const categoryEnum = z.enum(CATEGORY_ENUM_VALUES);

const expenseCategorySet = new Set<TransactionCategoryKey>(EXPENSE_CATEGORY_KEYS);
const incomeCategorySet = new Set<TransactionCategoryKey>(INCOME_CATEGORY_KEYS);

/**
 * YYYY-MM-DD 形式の妥当性チェック
 * 
 * @param value - 入力値
 * @returns 妥当な日付かどうか
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
 * 取引フォームのバリデーションスキーマ
 */
const amountSchema = z
  .preprocess((value) => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return NaN;
      }
      const normalized = trimmed.replace(/,/g, '');
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? NaN : parsed;
    }
    return value;
  }, z.number())
  .refine((value) => Number.isFinite(value), {
    message: '金額を数値で入力してください',
  })
  .refine((value) => value > 0, {
    message: '金額は1円以上で入力してください',
  });

export const transactionSchema = z
  .object({
    /** 取引タイプ */
    type: transactionTypeEnum,
    /** 金額 */
    amount: amountSchema,
    /** 発生日 */
    occurredOn: z
      .string()
      .min(1, '発生日を入力してください')
      .refine(isValidDate, '有効な日付を YYYY-MM-DD 形式で入力してください'),
    /** カテゴリ */
    category: categoryEnum,
    /** メモ */
    note: z
      .string()
      .max(120, 'メモは120文字以内で入力してください')
      .optional()
      .nullable(),
    /** 家庭向け立替フラグ */
    isHouseholdAdvance: z.boolean().default(false),
    /** 支払者 */
    payerUserId: z
      .string()
      .uuid('支払者が不正です')
      .optional()
      .nullable(),
    /** 立替先 */
    advanceToUserId: z
      .string()
      .uuid('立替先が不正です')
      .optional()
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if ((values.type === 'expense' || values.type === 'advance') && !values.payerUserId) {
      ctx.addIssue({
        path: ['payerUserId'],
        code: z.ZodIssueCode.custom,
        message: '支払者を選択してください',
      });
    }

    if (
      (values.type === 'expense' || values.type === 'advance') &&
      !expenseCategorySet.has(values.category)
    ) {
      ctx.addIssue({
        path: ['category'],
        code: z.ZodIssueCode.custom,
        message: '支出・立替には対応するカテゴリを選択してください',
      });
    }

    if (values.type === 'income' && !incomeCategorySet.has(values.category)) {
      ctx.addIssue({
        path: ['category'],
        code: z.ZodIssueCode.custom,
        message: '収入には収入カテゴリを選択してください',
      });
    }

    if (values.type !== 'advance' && values.advanceToUserId) {
      ctx.addIssue({
        path: ['advanceToUserId'],
        code: z.ZodIssueCode.custom,
        message: '立替先は立替取引でのみ指定できます',
      });
    }

    if (
      values.type === 'advance' &&
      values.payerUserId &&
      values.advanceToUserId &&
      values.payerUserId === values.advanceToUserId
    ) {
      ctx.addIssue({
        path: ['advanceToUserId'],
        code: z.ZodIssueCode.custom,
        message: '支払者と立替先は異なるメンバーを指定してください',
      });
    }
  });

/**
 * 取引フォームの型
 */
export type TransactionFormData = z.infer<typeof transactionSchema>;

/**
 * バリデーション済みデータをサービスで利用する形に変換
 * 
 * @param data - フォームデータ
 * @param householdId - 世帯ID
 * @returns 取引作成用データ
 */
export function toTransactionData(
  data: TransactionFormData,
  householdId: string
): TransactionData {
  const isHouseholdAdvance = data.type === 'expense' && data.isHouseholdAdvance === true;
  const resolvedType: TransactionData['type'] = isHouseholdAdvance ? 'advance' : data.type;
  const resolvedAdvanceToUserId =
    resolvedType === 'advance'
      ? isHouseholdAdvance
        ? null
        : data.advanceToUserId ?? null
      : null;

  return {
    householdId,
    type: resolvedType,
    amount: data.amount,
    occurredOn: data.occurredOn,
    category: data.category,
    note: data.note?.trim() ? data.note.trim() : null,
    payerUserId: data.payerUserId ?? null,
    advanceToUserId: resolvedAdvanceToUserId,
  };
}
