/**
 * サインインフォームコンポーネント
 * 
 * メールアドレスとパスワードでサインインするためのフォーム。
 * - バリデーション付き入力フィールド
 * - エラー表示
 * - ローディング状態管理
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import { signInSchema, type SignInFormData } from '@/lib/validations/auth';

/**
 * サインインフォームコンポーネント
 * 
 * @returns サインインフォーム
 */
export function SignInForm() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  /**
   * フォーム送信処理
   */
  const onSubmit = async (data: SignInFormData) => {
    try {
      setIsLoading(true);
      await signIn(data.email, data.password);
      toast.success('サインインしました');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('サインインエラー:', error);
      toast.error(
        error instanceof Error ? error.message : 'サインインに失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <Input
          id="password"
          type="password"
          placeholder="••••••"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'サインイン中...' : 'サインイン'}
      </Button>
    </form>
  );
}

