/**
 * 参加コード発行モーダル
 * 
 * 世帯の参加コードを発行・共有するためのモーダル。
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';

/**
 * 参加コード発行モーダルのProps
 */
interface ShareJoinCodeModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルの開閉状態を変更するコールバック */
  onOpenChange: (open: boolean) => void;
}

/**
 * 参加コード発行モーダルコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 参加コード発行モーダル
 */
export function ShareJoinCodeModal({
  open,
  onOpenChange,
}: ShareJoinCodeModalProps) {
  const user = useAuthStore((state) => state.user);
  const { household, joinCode, generateJoinCode } = useHouseholdStore();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * コードを発行
   */
  const handleGenerateCode = useCallback(async () => {
    if (!user || !household) {
      toast.error('世帯情報が取得できません');
      return;
    }

    try {
      setIsLoading(true);
      await generateJoinCode(household.id, user.id);
      toast.success('参加コードを発行しました');
    } catch (error) {
      console.error('コード発行エラー:', error);
      toast.error(
        error instanceof Error ? error.message : '参加コードの発行に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, household, generateJoinCode]);

  /**
   * モーダルを開いた時に自動的にコードを発行
   */
  useEffect(() => {
    if (open && !joinCode) {
      handleGenerateCode();
    }
  }, [open, joinCode, handleGenerateCode]);

  /**
   * クリップボードにコピー
   */
  const handleCopy = async () => {
    if (!joinCode) return;

    try {
      await navigator.clipboard.writeText(joinCode.code);
      toast.success('参加コードをコピーしました');
    } catch (error) {
      console.error('コピーエラー:', error);
      toast.error('コピーに失敗しました');
    }
  };

  /**
   * 有効期限の表示
   */
  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>参加コードを共有</DialogTitle>
          <DialogDescription>
            パートナーにこのコードを共有して、世帯に招待しましょう
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {joinCode ? (
            <>
              <div className="space-y-2">
                <Label>参加コード</Label>
                <div className="flex gap-2">
                  <Input
                    value={joinCode.code}
                    readOnly
                    className="font-mono text-center text-2xl font-bold tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <p className="font-medium">有効期限</p>
                <p className="text-gray-600">
                  {formatExpiryDate(joinCode.expiresAt)}まで
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-medium">💡 使い方</p>
                <ol className="mt-2 space-y-1 text-blue-800">
                  <li>1. このコードをパートナーに共有</li>
                  <li>2. パートナーがアカウント作成後、コードを入力</li>
                  <li>3. 自動的に世帯に参加完了！</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateCode}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  再発行
                </Button>
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  閉じる
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-gray-600">コードを発行中...</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

