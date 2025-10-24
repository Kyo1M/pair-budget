/**
 * 世帯作成モーダル
 * 
 * 新しい世帯を作成するためのモーダル。
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
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
  createHouseholdSchema,
  type CreateHouseholdFormData,
} from '@/lib/validations/household';

/**
 * 世帯作成モーダルのProps
 */
interface CreateHouseholdModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルの開閉状態を変更するコールバック */
  onOpenChange: (open: boolean) => void;
}

/**
 * 世帯作成モーダルコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 世帯作成モーダル
 */
export function CreateHouseholdModal({
  open,
  onOpenChange,
}: CreateHouseholdModalProps) {
  const user = useAuthStore((state) => state.user);
  const createHousehold = useHouseholdStore((state) => state.createHousehold);
  const [isLoading, setIsLoading] = useState(false);

  // モーダルが開いている間、bodyスクロールを無効化
  useBodyScrollLock(open);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateHouseholdFormData>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: {
      name: '',
    },
  });

  /**
   * フォーム送信処理
   */
  const onSubmit = async (data: CreateHouseholdFormData) => {
    if (!user) {
      toast.error('ユーザー情報が取得できません');
      return;
    }

    console.log('世帯作成開始:', { userId: user.id, householdName: data.name });

    try {
      setIsLoading(true);
      await createHousehold(data.name);
      
      toast.success('世帯を作成しました', {
        description: `「${data.name}」を作成しました`,
      });
      
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('世帯作成エラー:', error);
      toast.error(
        error instanceof Error ? error.message : '世帯の作成に失敗しました'
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
          <DialogTitle>世帯を作成</DialogTitle>
          <DialogDescription>
            新しい世帯を作成して、パートナーを招待しましょう
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">世帯名</Label>
            <Input
              id="name"
              type="text"
              placeholder="例: 山田家"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
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
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

