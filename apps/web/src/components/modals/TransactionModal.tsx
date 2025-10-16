/**
 * 取引登録モーダル
 */

'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { HouseholdMember } from '@/types/household';
import type { Transaction, TransactionType } from '@/types/transaction';
import {
  transactionSchema,
  type TransactionFormData,
  toTransactionData,
} from '@/lib/validations/transaction';
import { TRANSACTION_CATEGORIES } from '@/constants/categories';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionStore } from '@/store/useTransactionStore';

/**
 * モーダルのプロパティ
 */
interface TransactionModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルの開閉を制御するコールバック */
  onOpenChange: (open: boolean) => void;
  /** 世帯ID */
  householdId: string;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** デフォルトの取引タイプ */
  defaultType?: TransactionType;
  /** 取引作成成功時のコールバック */
  onSuccess?: (transaction: Transaction) => Promise<void> | void;
}

/**
 * 今日の日付を YYYY-MM-DD 形式で取得
 */
function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/**
 * 会員名の表示
 */
function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

/**
 * 取引登録モーダル
 */
export function TransactionModal({
  open,
  onOpenChange,
  householdId,
  members,
  defaultType = 'expense',
  onSuccess,
}: TransactionModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const isSubmitting = useTransactionStore((state) => state.isSubmitting);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType,
      amount: 0,
      occurredOn: getToday(),
      category: TRANSACTION_CATEGORIES[0].key,
      note: '',
      payerUserId: currentUser?.id ?? null,
      advanceToUserId: null,
    },
  });

  const transactionType = watch('type');
  const payerUserId = watch('payerUserId');

  /**
   * モーダルを開くたびに初期値をリセット
   */
  useEffect(() => {
    if (open) {
      reset({
        type: defaultType,
        amount: 0,
        occurredOn: getToday(),
        category: TRANSACTION_CATEGORIES[0].key,
        note: '',
        payerUserId: currentUser?.id ?? null,
        advanceToUserId: null,
      });
    }
  }, [open, defaultType, reset, currentUser?.id]);

  /**
   * 立替以外では advanceToUserId をクリア
   */
  useEffect(() => {
    if (transactionType !== 'advance') {
      setValue('advanceToUserId', null);
    }
  }, [transactionType, setValue]);

  /**
   * フォーム送信
   */
  const onSubmit = async (data: TransactionFormData) => {
    try {
      const transaction = await addTransaction(toTransactionData(data, householdId));

      toast.success('取引を登録しました', {
        description: `${getTypeLabel(transaction.type)}: ¥${transaction.amount.toLocaleString()}`,
      });

      if (onSuccess) {
        await onSuccess(transaction);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('取引作成エラー:', error);
      toast.error(error instanceof Error ? error.message : '取引の登録に失敗しました');
    }
  };

  /**
   * タブ変更時の処理
   */
  const handleTabChange = (value: string) => {
    const newType = value as TransactionType;
    setValue('type', newType);

    if ((newType === 'expense' || newType === 'advance') && !watch('payerUserId')) {
      setValue('payerUserId', currentUser?.id ?? null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>取引を登録</DialogTitle>
          <DialogDescription>
            支出・収入・立替を記録して家計を把握しましょう
          </DialogDescription>
        </DialogHeader>

        <Tabs value={transactionType} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="expense">支出</TabsTrigger>
            <TabsTrigger value="income">収入</TabsTrigger>
            <TabsTrigger value="advance">立替</TabsTrigger>
          </TabsList>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-4 space-y-5"
          >
            <TabsContent value={transactionType}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">金額</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    step="1"
                    placeholder="0"
                    disabled={isSubmitting}
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occurredOn">日付</Label>
                  <Input
                    id="occurredOn"
                    type="date"
                    disabled={isSubmitting}
                    {...register('occurredOn')}
                  />
                  {errors.occurredOn && (
                    <p className="text-sm text-red-500">{errors.occurredOn.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ</Label>
                <select
                  id="category"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                  {...register('category')}
                >
                  {TRANSACTION_CATEGORIES.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">メモ</Label>
                <textarea
                  id="note"
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
                  placeholder="どんな取引かメモできます"
                  disabled={isSubmitting}
                  {...register('note')}
                />
                {errors.note && (
                  <p className="text-sm text-red-500">{errors.note.message}</p>
                )}
              </div>

              {(transactionType === 'expense' || transactionType === 'advance') && (
                <div className="space-y-2">
                  <Label>支払者</Label>
                  <Controller
                    name="payerUserId"
                    control={control}
                    render={({ field }) => (
                      <select
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.value ? event.target.value : null)
                        }
                      >
                        <option value="" disabled>
                          支払者を選択
                        </option>
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {getMemberLabel(member)}
                            {member.userId === currentUser?.id ? '（自分）' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.payerUserId && (
                    <p className="text-sm text-red-500">{errors.payerUserId.message}</p>
                  )}
                </div>
              )}

              {transactionType === 'advance' && (
                <div className="space-y-2">
                  <Label>立替先</Label>
                  <Controller
                    name="advanceToUserId"
                    control={control}
                    render={({ field }) => (
                      <select
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                        value={field.value ?? '__household__'}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === '__household__'
                              ? null
                              : event.target.value
                          )
                        }
                      >
                        <option value="__household__">家庭全体に立替</option>
                        {members
                          .filter((member) => member.userId !== payerUserId)
                          .map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {getMemberLabel(member)}
                              {member.userId === currentUser?.id ? '（自分）' : ''}
                            </option>
                          ))}
                      </select>
                    )}
                  />
                  {errors.advanceToUserId && (
                    <p className="text-sm text-red-500">{errors.advanceToUserId.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    家庭全体を選ぶと household 全体への立替として計上します
                  </p>
                </div>
              )}
            </TabsContent>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? '保存中...' : '登録する'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 取引タイプの表示名
 */
function getTypeLabel(type: TransactionType): string {
  switch (type) {
    case 'income':
      return '収入';
    case 'advance':
      return '立替';
    case 'expense':
    default:
      return '支出';
  }
}
