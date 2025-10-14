/**
 * ホームページ
 * 
 * 世帯の有無に応じて表示を切り替えます。
 * - 世帯なし: HouseholdSetupCard を表示
 * - 世帯あり: Dashboard を表示（後で詳細実装）
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Share2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';
import { HouseholdSetupCard } from '@/components/household/HouseholdSetupCard';
import { ShareJoinCodeModal } from '@/components/modals/ShareJoinCodeModal';

/**
 * ホームページコンポーネント
 * 
 * @returns ホームページ
 */
export default function Home() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { household, members, loadHousehold, isLoading } = useHouseholdStore();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  /**
   * 世帯情報を読み込み
   */
  useEffect(() => {
    if (user) {
      loadHousehold(user.id);
    }
  }, [user, loadHousehold]);

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

  /**
   * ローディング中の表示
   */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  /**
   * 世帯なしの表示
   */
  if (!household) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold">ふたりの財布</h1>
            <p className="mt-2 text-gray-600">夫婦のための家計管理アプリ</p>
          </div>

          <HouseholdSetupCard />

          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </div>
    );
  }

  /**
   * 世帯ありの表示（簡易ダッシュボード）
   */
  const isOwner = household.ownerUserId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold">{household.name}</h1>
            <p className="text-sm text-gray-600">
              {user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <Button
                onClick={() => setIsShareModalOpen(true)}
                variant="outline"
                size="sm"
              >
                <Share2 className="mr-2 h-4 w-4" />
                参加コードを共有
              </Button>
            )}
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-4xl p-4">
        <div className="space-y-6">
          {/* 世帯情報カード */}
          <Card>
            <CardHeader>
              <CardTitle>世帯情報</CardTitle>
              <CardDescription>現在の世帯メンバー</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {member.profile?.name || member.profile?.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                      </p>
                    </div>
                    {member.userId === user?.id && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        あなた
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 開発中の機能 */}
          <Card>
            <CardHeader>
              <CardTitle>開発中の機能</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ 認証機能（サインアップ・サインイン）</li>
                <li>✅ 世帯管理（作成・参加コード）</li>
                <li>⏳ 取引登録（支出・収入・立替）</li>
                <li>⏳ ダッシュボード</li>
                <li>⏳ 精算機能</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 参加コード共有モーダル */}
      <ShareJoinCodeModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      />
    </div>
  );
}
