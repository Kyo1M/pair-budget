/**
 * 精算記録モーダル
 */

'use client';

import { useEffect, useMemo } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettlementStore } from '@/store/useSettlementStore';
import type { HouseholdMember } from '@/types/household';
import {
  HOUSEHOLD_SETTLEMENT_KEY,
  settlementSchema,
  type SettlementFormData,
} from '@/lib/validations/settlement';

interface SettlementModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダル開閉制御 */
  onOpenChange: (open: boolean) => void;
  /** 世帯ID */
  householdId: string;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 初期選択するパートナーID */
  initialPartnerId?: string;
  /** 初期選択する精算方向 */
  initialDirection?: 'pay' | 'receive';
}

function getToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SettlementModal({
  open,
  onOpenChange,
  householdId,
  members,
  initialPartnerId,
  initialDirection,
}: SettlementModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const balances = useSettlementStore((state) => state.balances);
  const addSettlement = useSettlementStore((state) => state.addSettlement);
  const isSubmitting = useSettlementStore((state) => state.isSubmitting);

  const partnerOptions = useMemo(() => {
    const householdOption = {
      value: HOUSEHOLD_SETTLEMENT_KEY,
      label: '世帯全体',
    };

    if (!currentUser) {
      return [householdOption];
    }

    const memberOptions = members
      .filter((member) => member.userId !== currentUser.id)
      .map((member) => ({
        value: member.userId,
        label: member.profile?.name || member.profile?.email || '名前未設定',
      }));

    return [householdOption, ...memberOptions];
  }, [members, currentUser]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema) as Resolver<SettlementFormData>,
    defaultValues: {
      direction: 'receive',
      partnerUserId: HOUSEHOLD_SETTLEMENT_KEY,
      amount: 0,
      settledOn: getToday(),
      note: '',
    },
  });

  const direction = watch('direction');
  const partnerUserId = watch('partnerUserId');

  /**
   * モーダルを開いたタイミングで初期値を設定
   */
  useEffect(() => {
    if (open) {
      const defaultPartnerId =
        initialPartnerId ??
        partnerOptions[0]?.value ??
        HOUSEHOLD_SETTLEMENT_KEY;
      const defaultDirection = initialDirection ?? 'receive';
      reset({
        direction: defaultDirection,
        partnerUserId: defaultPartnerId,
        amount: 0,
        settledOn: getToday(),
        note: '',
      });
    }
  }, [open, partnerOptions, reset, initialPartnerId, initialDirection]);

  /**
   * 相手が存在しない場合はフォームを無効化
   */
  const isFormDisabled = !currentUser;

  const currentBalance =
    balances.find((balance) => balance.userId === currentUser?.id)?.balanceAmount ?? 0;

  const partnerBalance =
    partnerUserId && partnerUserId !== HOUSEHOLD_SETTLEMENT_KEY
      ? balances.find((balance) => balance.userId === partnerUserId)?.balanceAmount ?? null
      : null;

  const partnerLabel = useMemo(() => {
    if (partnerUserId === HOUSEHOLD_SETTLEMENT_KEY) {
      return '世帯全体';
    }
    const option = partnerOptions.find((item) => item.value === partnerUserId);
    return option?.label ?? '相手';
  }, [partnerUserId, partnerOptions]);

  /**
   * フォーム送信
   */
  const onSubmit: SubmitHandler<SettlementFormData> = async (data) => {
    if (!currentUser) {
      toast.error('ユーザー情報が取得できません');
      return;
    }

    if (!data.partnerUserId) {
      toast.error('相手を選択してください');
      return;
    }

    const isHouseholdSettlement = data.partnerUserId === HOUSEHOLD_SETTLEMENT_KEY;

    const fromUserId =
      data.direction === 'pay'
        ? currentUser.id
        : isHouseholdSettlement
          ? null
          : data.partnerUserId;
    const toUserId =
      data.direction === 'pay'
        ? isHouseholdSettlement
          ? null
          : data.partnerUserId
        : currentUser.id;

    try {
      await addSettlement({
        householdId,
        fromUserId,
        toUserId,
        amount: data.amount,
        settledOn: data.settledOn,
        note: data.note?.trim() ? data.note.trim() : null,
      });

      const partnerDescriptor =
        isHouseholdSettlement ? '世帯全体' : partnerLabel;
      const actionPhrase =
        data.direction === 'pay' ? `${partnerDescriptor}へ支払いました` : `${partnerDescriptor}から受け取りました`;

      toast.success('精算を記録しました', {
        description: `${formatCurrency(data.amount)} を${actionPhrase}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('精算記録エラー:', error);
      toast.error(error instanceof Error ? error.message : '精算の記録に失敗しました');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>精算を記録</DialogTitle>
          <DialogDescription>
            立替残高に基づいてパートナーや世帯全体との精算を記録します
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Tabs
            value={direction}
            onValueChange={(value) =>
              setValue('direction', value as SettlementFormData['direction'])
            }
            className="w-full space-y-5"
          >
            <div className="space-y-3">
              <Label>精算の方向</Label>
              <TabsList className="w-full">
                <TabsTrigger value="pay" className="flex-1">
                  あなたが支払う
                </TabsTrigger>
                <TabsTrigger value="receive" className="flex-1">
                  あなたが受け取る
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnerUserId">相手</Label>
              <select
                id="partnerUserId"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
                disabled={isSubmitting || isFormDisabled}
                {...register('partnerUserId')}
              >
                <option value="" disabled>
                  相手を選択してください
                </option>
                {partnerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.partnerUserId && (
                <p className="text-sm text-red-500">{errors.partnerUserId.message}</p>
              )}
              {partnerUserId === HOUSEHOLD_SETTLEMENT_KEY && (
                <p className="text-xs text-gray-500">
                  世帯全体への精算として記録され、残高は世帯全員に再配分されます。
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">金額</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  step="1"
                  disabled={isSubmitting || isFormDisabled}
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="settledOn">精算日</Label>
                <Input
                  id="settledOn"
                  type="date"
                  disabled={isSubmitting || isFormDisabled}
                  {...register('settledOn')}
                />
                {errors.settledOn && (
                  <p className="text-sm text-red-500">{errors.settledOn.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">メモ</Label>
              <textarea
                id="note"
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
                placeholder="任意でメモを入力できます"
                disabled={isSubmitting}
                {...register('note')}
              />
              {errors.note && (
                <p className="text-sm text-red-500">{errors.note.message}</p>
              )}
            </div>
          </Tabs>

          <div className="space-y-2 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            <p className="font-semibold">現在の立替残高</p>
            <p className="flex items-baseline gap-2 text-base">
              <span className="text-gray-600">あなた:</span>
              <span
                className={
                  currentBalance > 0
                    ? 'font-semibold text-emerald-600'
                    : currentBalance < 0
                      ? 'font-semibold text-rose-600'
                      : 'font-semibold text-gray-700'
                }
              >
                {formatCurrency(currentBalance)}
              </span>
            </p>
            <p className="flex items-baseline gap-2 text-base">
              <span className="text-gray-600">対象:</span>
              <span className="font-semibold text-gray-700">{partnerLabel}</span>
            </p>
            {partnerBalance !== null && (
              <p className="flex items-baseline gap-2 text-base">
                <span className="text-gray-600">残高:</span>
                <span
                  className={
                    partnerBalance > 0
                      ? 'font-semibold text-emerald-600'
                      : partnerBalance < 0
                        ? 'font-semibold text-rose-600'
                        : 'font-semibold text-gray-700'
                  }
                >
                  {formatCurrency(partnerBalance)}
                </span>
              </p>
            )}
            {partnerBalance === null && partnerUserId === HOUSEHOLD_SETTLEMENT_KEY && (
              <p className="text-xs text-blue-600">
                世帯全体への精算として記録され、他メンバーの残高が再計算されます。
              </p>
            )}
            <p className="text-xs text-blue-600">
              プラスは受け取る金額、マイナスは支払う金額を意味します。
            </p>
          </div>

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
            <Button
              type="submit"
              disabled={isSubmitting || isFormDisabled}
              className="flex-1"
            >
              {isSubmitting ? '記録中...' : '精算を記録'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
