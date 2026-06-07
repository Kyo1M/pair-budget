/**
 * 開発用テストログインボタン
 *
 * ローカル開発時のみ表示し、env に設定したテストアカウントで即ログインする。
 * `NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'` のときだけ描画され、
 * 本番（Vercel 等）では env 未設定のため何も描画されず資格情報もバンドルに残らない。
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

/** テストアカウント定義 */
interface DevAccount {
  /** ボタン表示名 */
  label: string;
  /** メールアドレス（env から取得・未設定なら undefined） */
  email?: string;
  /** パスワード（env から取得・未設定なら undefined） */
  password?: string;
}

/**
 * 開発用テストログインボタン群
 *
 * @returns dev-login が有効なときのみボタン群、そうでなければ null
 */
export function DevLoginButton() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== 'true') {
    return null;
  }

  const accounts: DevAccount[] = [
    {
      label: 'テスト太郎でログイン',
      email: process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL,
      password: process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD,
    },
    {
      label: 'テスト花子でログイン',
      email: process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL,
      password: process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_PASSWORD,
    },
  ];

  const handleLogin = async (account: DevAccount) => {
    if (!account.email || !account.password) {
      toast.error('テストアカウントの資格情報が未設定です（.env.local を確認）');
      return;
    }
    try {
      setLoadingLabel(account.label);
      await signIn(account.email, account.password);
      toast.success('テストログインしました');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'テストログインに失敗しました'
      );
    } finally {
      setLoadingLabel(null);
    }
  };

  return (
    <div className="mt-6 space-y-2 border-t pt-4">
      <p className="text-center text-xs text-muted-foreground">
        開発用テストログイン
      </p>
      {accounts.map((account) => (
        <Button
          key={account.label}
          type="button"
          variant="outline"
          className="w-full"
          disabled={loadingLabel !== null}
          onClick={() => handleLogin(account)}
        >
          {loadingLabel === account.label ? 'ログイン中...' : account.label}
        </Button>
      ))}
    </div>
  );
}
