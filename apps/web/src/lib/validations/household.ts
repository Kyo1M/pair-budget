/**
 * 世帯関連のバリデーションスキーマ
 * 
 * 世帯作成・参加フォームの入力値を検証します。
 */

import { z } from 'zod';

/**
 * 世帯作成フォームのバリデーションスキーマ
 */
export const createHouseholdSchema = z.object({
  /** 世帯名 */
  name: z
    .string()
    .min(1, '世帯名を入力してください')
    .max(50, '世帯名は50文字以内で入力してください'),
});

/**
 * 世帯作成フォームの型定義
 */
export type CreateHouseholdFormData = z.infer<typeof createHouseholdSchema>;

/**
 * 世帯参加フォームのバリデーションスキーマ
 */
export const joinHouseholdSchema = z.object({
  /** 参加コード */
  code: z
    .string()
    .min(1, '参加コードを入力してください')
    .length(6, '参加コードは6文字です')
    .regex(/^[A-Z0-9]+$/, '参加コードは英数字のみです'),
});

/**
 * 世帯参加フォームの型定義
 */
export type JoinHouseholdFormData = z.infer<typeof joinHouseholdSchema>;

