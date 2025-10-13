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
  /** パスワード */
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(6, 'パスワードは6文字以上で入力してください'),
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
    /** パスワード */
    password: z
      .string()
      .min(1, 'パスワードを入力してください')
      .min(6, 'パスワードは6文字以上で入力してください'),
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

