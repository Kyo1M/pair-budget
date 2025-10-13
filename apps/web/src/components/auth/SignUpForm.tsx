/**
 * サインアップフォームコンポーネント
 * 
 * メールアドレス、パスワード、名前で新規登録するためのフォーム。
 * - バリデーション付き入力フィールド
 * - パスワード確認
 * - エラー表示
 * - ローディング状態管理
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import { signUpSchema, type SignUpFormData } from '@/lib/validations/auth';

/**
 * サインアップフォームコンポーネント
 * 
 * @returns サインアップフォーム
 */
export function SignUpForm() {
  const signUp = useAuthStore((state) => state.signUp);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  /**
   * フォーム送信処理
   */
  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsLoading(true);
      await signUp(data.email, data.password, data.name);
      
      // アカウント作成成功の通知
      toast.success('アカウントを作成しました', {
        description: 'メールアドレスに認証リンクを送信しました。メールを確認して認証を完了してください。',
        duration: 8000,
      });
      
      // ログイン前の状態に戻す（メール認証が必要な場合）
      // router.push('/');
      // router.refresh();
    } catch (error) {
      console.error('サインアップエラー:', error);
      toast.error(
        error instanceof Error ? error.message : '新規登録に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          type="text"
          placeholder="山田 太郎"
          {...register('name')}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@example.com"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <PasswordInput
          id="password"
          placeholder="••••••"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">パスワード（確認）</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••"
          {...register('confirmPassword')}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'アカウント作成中...' : 'アカウントを作成'}
      </Button>
    </form>
  );
}

