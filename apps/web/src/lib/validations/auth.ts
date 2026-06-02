/**
 * 認証関連のバリデーションスキーマ
 * 
 * サインイン・サインアップフォームの入力値を検証します。
 */

import { z } from 'zod';

/**
 * サインインフォームのバリデーションスキーマ
 */
export const signInSchema = z.object({
  /** メールアドレス */
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  /**
   * パスワード
   * サインインでは長さを強制しない（既存アカウントが締め出されないように）。
   * 実際の資格情報チェックは Supabase Auth が行う。
   */
  password: z
    .string()
    .min(1, 'パスワードを入力してください'),
});

/**
 * サインインフォームの型定義
 */
export type SignInFormData = z.infer<typeof signInSchema>;

/**
 * サインアップフォームのバリデーションスキーマ
 */
export const signUpSchema = z
  .object({
    /** 名前 */
    name: z
      .string()
      .min(1, '名前を入力してください')
      .max(50, '名前は50文字以内で入力してください'),
    /** メールアドレス */
    email: z
      .string()
      .min(1, 'メールアドレスを入力してください')
      .email('有効なメールアドレスを入力してください'),
    /** パスワード（新規登録は8文字以上＋英字と数字を含む） */
    password: z
      .string()
      .min(1, 'パスワードを入力してください')
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(/[a-zA-Z]/, 'パスワードには英字を含めてください')
      .regex(/[0-9]/, 'パスワードには数字を含めてください'),
    /** パスワード確認 */
    confirmPassword: z
      .string()
      .min(1, 'パスワード（確認）を入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

/**
 * サインアップフォームの型定義
 */
export type SignUpFormData = z.infer<typeof signUpSchema>;

