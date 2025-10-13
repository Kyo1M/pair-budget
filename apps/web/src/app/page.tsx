/**
 * ホームページ
 * 
 * 一時的なログアウト機能付きホームページ。
 * 後で世帯管理機能に置き換える予定。
 */

'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * ホームページコンポーネント
 * 
 * @returns ホームページ
 */
export default function Home() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  /**
   * ログアウト処理
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました');
      router.push('/auth');
      router.refresh();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      toast.error('ログアウトに失敗しました');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold">ふたりの財布</h1>
          <p className="mt-2 text-gray-600">夫婦のための家計管理アプリ</p>
        </div>

        {user && (
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-xl font-semibold">ようこそ！</h2>
            <p className="mt-2 text-gray-600">
              {user.email}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              認証が完了しました。<br />
              次のステップで世帯管理機能を実装します。
            </p>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="mt-6 w-full"
            >
              ログアウト
            </Button>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="font-semibold">開発中の機能</h3>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>✅ 認証機能（サインアップ・サインイン）</li>
            <li>⏳ 世帯管理（作成・参加コード）</li>
            <li>⏳ 取引登録（支出・収入・立替）</li>
            <li>⏳ ダッシュボード</li>
            <li>⏳ 精算機能</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
