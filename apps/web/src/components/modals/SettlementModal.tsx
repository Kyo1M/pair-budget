/** 残高明細に対する精算記録モーダル */

'use client';

import { useEffect, useMemo } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
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
import { useSettlementStore } from '@/store/useSettlementStore';
import {
  HOUSEHOLD_SETTLEMENT_KEY,
  settlementSchema,
  type SettlementFormData,
} from '@/lib/validations/settlement';
import type { HouseholdBalanceBreakdown } from '@/types/settlement';

interface SettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  initialSubjectUserId?: string;
  initialCounterpartyUserId?: string | null;
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

function detailKey(detail: HouseholdBalanceBreakdown): string {
  return `${detail.subjectUserId}:${detail.counterpartyUserId ?? HOUSEHOLD_SETTLEMENT_KEY}`;
}

function memberLabel(name: string | null): string {
  return name || '名前未設定';
}

export function SettlementModal({
  open,
  onOpenChange,
  householdId,
  initialSubjectUserId,
  initialCounterpartyUserId,
}: SettlementModalProps) {
  const balances = useSettlementStore((state) => state.balances);
  const settleBalance = useSettlementStore((state) => state.settleBalance);
  const isSubmitting = useSettlementStore((state) => state.isSubmitting);

  useBodyScrollLock(open);

  const details = useMemo(
    () => balances.flatMap((balance) => balance.breakdowns).filter((detail) => detail.balanceAmount !== 0),
    [balances]
  );

  const initialDetail = useMemo(() => {
    const requested = details.find(
      (detail) =>
        detail.subjectUserId === initialSubjectUserId &&
        detail.counterpartyUserId === (initialCounterpartyUserId ?? null)
    );
    return requested ?? details[0];
  }, [details, initialCounterpartyUserId, initialSubjectUserId]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema) as Resolver<SettlementFormData>,
    defaultValues: {
      targetKey: '',
      amount: '' as unknown as number,
      settledOn: getToday(),
      note: '',
    },
  });

  const targetKey = watch('targetKey');
  const amount = watch('amount');
  const selectedDetail = details.find((detail) => detailKey(detail) === targetKey) ?? null;
  const outstandingAmount = Math.abs(selectedDetail?.balanceAmount ?? 0);
  const numericAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const remainingAmount = Math.max(0, outstandingAmount - numericAmount);

  useEffect(() => {
    if (!open) return;
    reset({
      targetKey: initialDetail ? detailKey(initialDetail) : '',
      amount: initialDetail ? Math.abs(initialDetail.balanceAmount) : ('' as unknown as number),
      settledOn: getToday(),
      note: '',
    });
  }, [initialDetail, open, reset]);

  const handleTargetChange = (value: string) => {
    setValue('targetKey', value, { shouldValidate: true });
    const detail = details.find((item) => detailKey(item) === value);
    setValue('amount', detail ? Math.abs(detail.balanceAmount) : ('' as unknown as number), {
      shouldValidate: true,
    });
  };

  const onSubmit: SubmitHandler<SettlementFormData> = async (data) => {
    const detail = details.find((item) => detailKey(item) === data.targetKey);
    if (!detail) {
      toast.error('精算する残高を選択してください');
      return;
    }
    if (data.amount > Math.abs(detail.balanceAmount)) {
      toast.error('精算額が現在の立替残高を超えています');
      return;
    }

    try {
      await settleBalance({
        householdId,
        subjectUserId: detail.subjectUserId,
        counterpartyUserId: detail.counterpartyUserId,
        amount: data.amount,
        settledOn: data.settledOn,
        note: data.note,
      });
      toast.success('精算を記録しました', {
        description: `${formatCurrency(data.amount)}・残り ${formatCurrency(
          Math.abs(detail.balanceAmount) - data.amount
        )}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('精算記録エラー:', error);
      // ストアの error はページ側で一度だけ通知する。
    }
  };

  const actionDescription = selectedDetail
    ? selectedDetail.isOverSettled
      ? '過去の精算額が元の立替残高を超えています。履歴を確認してから精算してください。'
      : selectedDetail.balanceAmount > 0
        ? `${selectedDetail.counterpartyUserId ? memberLabel(selectedDetail.counterpartyUserName) : '世帯全体'}から${memberLabel(selectedDetail.subjectUserName)}が受け取る精算です。`
        : `${memberLabel(selectedDetail.subjectUserName)}が${selectedDetail.counterpartyUserId ? memberLabel(selectedDetail.counterpartyUserName) : '世帯全体'}へ支払う精算です。`
    : '精算できる立替残高がありません。';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>立替残高を精算</DialogTitle>
          <DialogDescription>精算する人と相手を選び、受け渡した金額を記録します</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="settlementTarget">精算する残高</Label>
            <select
              id="settlementTarget"
              className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={isSubmitting || details.length === 0}
              value={targetKey}
              onChange={(event) => handleTargetChange(event.target.value)}
            >
              {details.length === 0 && <option value="">精算できる残高はありません</option>}
              {details.map((detail) => (
                <option key={detailKey(detail)} value={detailKey(detail)}>
                  {memberLabel(detail.subjectUserName)} × {detail.counterpartyUserId ? memberLabel(detail.counterpartyUserName) : '世帯全体'}（{formatCurrency(detail.balanceAmount)}）
                </option>
              ))}
            </select>
            {errors.targetKey && <p className="text-sm text-red-500">{errors.targetKey.message}</p>}
            <p className="text-sm text-gray-600">{actionDescription}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settlementAmount">受け渡した金額</Label>
              <Input
                id="settlementAmount"
                type="text"
                inputMode="numeric"
                pattern="[0-9,]*"
                className="min-h-11 text-base"
                disabled={isSubmitting || !selectedDetail}
                {...register('amount')}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="settledOn">精算日</Label>
              <Input id="settledOn" type="date" className="min-h-11 text-base" disabled={isSubmitting} {...register('settledOn')} />
              {errors.settledOn && <p className="text-sm text-red-500">{errors.settledOn.message}</p>}
            </div>
          </div>

          {selectedDetail && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="flex justify-between"><span>現在残高</span><strong>{formatCurrency(outstandingAmount)}</strong></div>
              <div className="mt-1 flex justify-between"><span>精算後の残り</span><strong>{formatCurrency(remainingAmount)}</strong></div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="settlementNote">メモ</Label>
            <textarea
              id="settlementNote"
              rows={3}
              className="min-h-20 w-full rounded-md border border-gray-200 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="任意でメモを入力できます"
              disabled={isSubmitting}
              {...register('note')}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => onOpenChange(false)} disabled={isSubmitting}>キャンセル</Button>
            <Button type="submit" className="min-h-11 flex-1" disabled={isSubmitting || !selectedDetail}>{isSubmitting ? '保存中...' : '精算を記録'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
