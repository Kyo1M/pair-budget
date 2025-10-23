/**
 * 参加コード入力モーダル
 * 
 * 参加コードを入力して世帯に参加するためのモーダル。
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';
import {
  joinHouseholdSchema,
  type JoinHouseholdFormData,
} from '@/lib/validations/household';

/**
 * 参加コード入力モーダルのProps
 */
interface JoinHouseholdModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルの開閉状態を変更するコールバック */
  onOpenChange: (open: boolean) => void;
}

/**
 * 参加コード入力モーダルコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 参加コード入力モーダル
 */
export function JoinHouseholdModal({
  open,
  onOpenChange,
}: JoinHouseholdModalProps) {
  const user = useAuthStore((state) => state.user);
  const joinHousehold = useHouseholdStore((state) => state.joinHousehold);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<JoinHouseholdFormData>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: {
      code: '',
    },
    mode: 'onChange', // リアルタイムバリデーションを有効化
  });

  const codeValue = watch('code');

  /**
   * フォーム送信処理
   */
  const onSubmit = async (data: JoinHouseholdFormData) => {
    if (!user) {
      toast.error('ユーザー情報が取得できません');
      return;
    }

    try {
      setIsLoading(true);
      await joinHousehold(data.code, user.id);
      
      toast.success('世帯に参加しました', {
        description: '世帯への参加が完了しました',
      });
      
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('世帯参加エラー:', error);
      toast.error(
        error instanceof Error ? error.message : '世帯への参加に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * モーダルを閉じる際の処理
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>世帯に参加</DialogTitle>
          <DialogDescription>
            パートナーから受け取った参加コードを入力してください
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">参加コード（6文字）</Label>
            <Input
              id="code"
              type="text"
              placeholder="ABC123"
              maxLength={6}
              className="font-mono text-center text-2xl font-bold uppercase tracking-widest"
              {...register('code', {
                onChange: (e) => {
                  // 自動的に大文字に変換
                  e.target.value = e.target.value.toUpperCase();
                }
              })}
              disabled={isLoading}
            />
            {errors.code && (
              <p className="text-sm text-red-500">{errors.code.message}</p>
            )}
            
            {codeValue && codeValue.length === 6 && (
              <p className="text-sm text-green-600">
                ✓ コードの入力が完了しました
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">⚠️ 注意事項</p>
            <ul className="mt-2 space-y-1 text-amber-800">
              <li>• コードは1回のみ使用できます</li>
              <li>• 有効期限は24時間です</li>
              <li>• MVP版では1つの世帯のみ所属可能です</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isValid || !codeValue || codeValue.length !== 6} 
              className="flex-1"
            >
              {isLoading ? '参加中...' : '参加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

