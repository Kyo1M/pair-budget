/** 取引登録・編集モーダル */

'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';
import { Controller, type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AmountCalculatorPopover } from '@/components/transactions/AmountCalculatorPopover';
import { CurrencyInput } from '@/components/transactions/CurrencyInput';
import { PlaceCombobox } from '@/components/transactions/PlaceCombobox';
import type { HouseholdMember } from '@/types/household';
import type {
  PlaceSuggestion,
  Transaction,
  TransactionCategoryKey,
  TransactionType,
} from '@/types/transaction';
import {
  transactionSchema,
  type TransactionFormData,
  toTransactionData,
} from '@/lib/validations/transaction';
import { getCategoriesByType } from '@/constants/categories';
import { getPlaceSuggestions } from '@/services/transactions';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionStore } from '@/store/useTransactionStore';

export interface TransactionPreset {
  type: TransactionType;
  amount: number;
  occurredOn: string;
  category: TransactionCategoryKey;
  note: string | null;
  payerUserId: string | null;
  advanceToUserId: string | null;
  place: string | null;
}

export type TransactionModalSource =
  | { kind: 'create'; type: TransactionType }
  | { kind: 'edit'; transaction: Transaction }
  | {
      kind: 'reminder';
      reminderKind: 'expense' | 'income';
      reminderId: string;
      preset: TransactionPreset;
    };

export interface TransactionSuccessContext {
  intent: 'close' | 'continue';
  source: TransactionModalSource;
}

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  members: HouseholdMember[];
  source: TransactionModalSource;
  onSuccess?: (
    transaction: Transaction,
    context: TransactionSuccessContext
  ) => Promise<void> | void;
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

function getTypeLabel(type: TransactionType): string {
  if (type === 'income') return '収入';
  if (type === 'advance') return '立替';
  return '支出';
}

export function TransactionModal({
  open,
  onOpenChange,
  householdId,
  members,
  source,
  onSuccess,
}: TransactionModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const isSubmitting = useTransactionStore((state) => state.isSubmitting);
  const formId = useId();
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useBodyScrollLock(open);

  const isEditMode = source.kind === 'edit';
  const locksType = source.kind !== 'create';
  const sourceType =
    source.kind === 'create'
      ? source.type
      : source.kind === 'edit'
        ? source.transaction.type
        : source.preset.type;

  const getDefaultCategoryForType = (type: TransactionType): TransactionCategoryKey =>
    getCategoriesByType(type)[0]?.key ?? 'other';

  const emptyDefaults = (type: TransactionType): TransactionFormData => ({
    type,
    amount: '' as unknown as number,
    occurredOn: getToday(),
    category: getDefaultCategoryForType(type),
    note: '',
    place: '',
    isHouseholdAdvance: false,
    payerUserId: type === 'income' ? null : currentUser?.id ?? null,
    advanceToUserId: null,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema) as Resolver<TransactionFormData>,
    defaultValues: emptyDefaults(sourceType),
  });

  const transactionType = watch('type');
  const payerUserId = watch('payerUserId');
  const category = watch('category');
  const isHouseholdAdvance = watch('isHouseholdAdvance');
  const categoriesForType = useMemo(
    () => getCategoriesByType(transactionType),
    [transactionType]
  );

  // 開く前の描画フレームで初期化し、以前の入力値が一瞬見えるのを防ぐ。
  useLayoutEffect(() => {
    if (!open) return;
    setSavedMessage(null);

    if (source.kind === 'create') {
      reset(emptyDefaults(source.type));
      return;
    }

    const preset = source.kind === 'edit' ? source.transaction : source.preset;
    reset({
      type: preset.type,
      amount: preset.amount,
      occurredOn: preset.occurredOn,
      category: preset.category ?? getDefaultCategoryForType(preset.type),
      note: preset.note ?? '',
      place: preset.place ?? '',
      isHouseholdAdvance: false,
      payerUserId: preset.payerUserId,
      advanceToUserId: preset.advanceToUserId,
    });
    // source が変わるたびに必ず別のフォーム内容として扱う。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset, source]);

  useEffect(() => {
    if (!open || !householdId) return;
    getPlaceSuggestions(householdId).then(setPlaceSuggestions).catch(() => setPlaceSuggestions([]));
  }, [open, householdId]);

  useEffect(() => {
    if (transactionType !== 'advance') setValue('advanceToUserId', null);
    if (transactionType !== 'expense' && isHouseholdAdvance) {
      setValue('isHouseholdAdvance', false);
    }
  }, [isHouseholdAdvance, setValue, transactionType]);

  useEffect(() => {
    if (!categoriesForType.some((item) => item.key === category) && categoriesForType[0]) {
      setValue('category', categoriesForType[0].key);
    }
  }, [categoriesForType, category, setValue]);

  const save = (intent: 'close' | 'continue'): SubmitHandler<TransactionFormData> => async (data) => {
    try {
      const transactionData = toTransactionData(data, householdId);
      if (source.kind === 'reminder') {
        transactionData.recurringExpenseId =
          source.reminderKind === 'expense' ? source.reminderId : null;
        transactionData.recurringIncomeId =
          source.reminderKind === 'income' ? source.reminderId : null;
      }

      const transaction =
        source.kind === 'edit'
          ? await updateTransaction(source.transaction.id, transactionData)
          : await addTransaction(transactionData);

      await onSuccess?.(transaction, { intent, source });

      if (intent === 'continue' && source.kind === 'create') {
        reset({
          ...data,
          amount: '' as unknown as number,
          note: '',
          place: '',
        });
        setSavedMessage(`${getTypeLabel(transaction.type)} ${transaction.amount.toLocaleString()}円を登録しました`);
        window.requestAnimationFrame(() => {
          document.getElementById(`${formId}-amount`)?.focus();
        });
        return;
      }

      toast.success(source.kind === 'edit' ? '取引を更新しました' : '取引を登録しました', {
        description: `${getTypeLabel(transaction.type)}: ¥${transaction.amount.toLocaleString()}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('取引処理エラー:', error);
      // ストアの error をページ側で一度だけ表示する。
    }
  };

  const handleTabChange = (value: string) => {
    const nextType = value as TransactionType;
    setValue('type', nextType);
    if ((nextType === 'expense' || nextType === 'advance') && !watch('payerUserId')) {
      setValue('payerUserId', currentUser?.id ?? null);
    }
    if (nextType === 'income') {
      setValue('payerUserId', null);
      setValue('advanceToUserId', null);
    }
    const nextCategory = getCategoriesByType(nextType)[0];
    if (nextCategory) setValue('category', nextCategory.key);
    setSavedMessage(null);
  };

  const id = (field: string) => `${formId}-${field}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl p-0 data-[state=open]:zoom-in-100 sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <DialogHeader className="sticky top-0 z-10 border-b bg-white px-5 py-4 pr-12 text-left">
          <DialogTitle>{isEditMode ? '取引を編集' : '取引を登録'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '取引内容を編集します' : '支出・収入・立替を記録します'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={transactionType} onValueChange={handleTabChange} className="gap-0">
          <div className="px-5 pt-4">
            <TabsList className="min-h-11 w-full">
              <TabsTrigger className="min-h-11 touch-manipulation" value="expense" disabled={locksType}>支出</TabsTrigger>
              <TabsTrigger className="min-h-11 touch-manipulation" value="income" disabled={locksType}>収入</TabsTrigger>
              <TabsTrigger className="min-h-11 touch-manipulation" value="advance" disabled={locksType}>立替</TabsTrigger>
            </TabsList>
          </div>

          <form className="space-y-5 px-5 pb-0 pt-4" onSubmit={(event) => event.preventDefault()}>
            {savedMessage && (
              <div role="status" className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />{savedMessage}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={id('amount')}>金額</Label>
                <div className="flex gap-2">
                  <CurrencyInput id={id('amount')} placeholder="金額を入力" disabled={isSubmitting} className="flex-1" aria-invalid={!!errors.amount} {...register('amount')} />
                  <AmountCalculatorPopover disabled={isSubmitting} onApply={(total) => setValue('amount', total, { shouldValidate: true })} />
                </div>
                {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor={id('occurredOn')}>日付</Label>
                <Input id={id('occurredOn')} type="date" className="min-h-11 text-base touch-manipulation" disabled={isSubmitting} {...register('occurredOn')} />
                {errors.occurredOn && <p className="text-sm text-red-500">{errors.occurredOn.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={id('category')}>カテゴリ</Label>
              <select id={id('category')} className="min-h-11 w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" disabled={isSubmitting} {...register('category')}>
                {categoriesForType.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            </div>

            {transactionType === 'expense' && (
              <label className="flex min-h-11 touch-manipulation items-start gap-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Controller name="isHouseholdAdvance" control={control} render={({ field }) => (
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" checked={field.value ?? false} onChange={(event) => field.onChange(event.target.checked)} disabled={isSubmitting} />
                )} />
                <span>家庭の支出を一旦立替えた場合はチェックしてください。後で世帯との精算に表示されます。</span>
              </label>
            )}

            <div className="space-y-2">
              <Label htmlFor={id('note')}>メモ</Label>
              <textarea id={id('note')} rows={3} className="min-h-20 w-full touch-manipulation rounded-md border border-gray-200 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="どんな取引かメモできます" disabled={isSubmitting} {...register('note')} />
              {errors.note && <p className="text-sm text-red-500">{errors.note.message}</p>}
            </div>

            {transactionType !== 'income' && (
              <div className="space-y-2">
                <Label htmlFor={id('place')}>場所（任意）</Label>
                <Controller name="place" control={control} render={({ field }) => (
                  <PlaceCombobox id={id('place')} value={field.value ?? ''} onChange={field.onChange} suggestions={placeSuggestions} disabled={isSubmitting} />
                )} />
                {errors.place && <p className="text-sm text-red-500">{errors.place.message}</p>}
              </div>
            )}

            {(transactionType === 'expense' || transactionType === 'advance') && (
              <div className="space-y-2">
                <Label htmlFor={id('payer')}>支払者</Label>
                <Controller name="payerUserId" control={control} render={({ field }) => (
                  <select id={id('payer')} className="min-h-11 w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base" disabled={isSubmitting} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value || null)}>
                    <option value="" disabled>支払者を選択</option>
                    {members.map((member) => <option key={member.userId} value={member.userId}>{getMemberLabel(member)}{member.userId === currentUser?.id ? '（自分）' : ''}</option>)}
                  </select>
                )} />
                {errors.payerUserId && <p className="text-sm text-red-500">{errors.payerUserId.message}</p>}
              </div>
            )}

            {transactionType === 'advance' && (
              <div className="space-y-2">
                <Label htmlFor={id('advanceTo')}>立替先</Label>
                <Controller name="advanceToUserId" control={control} render={({ field }) => (
                  <select id={id('advanceTo')} className="min-h-11 w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base" disabled={isSubmitting} value={field.value ?? '__household__'} onChange={(event) => field.onChange(event.target.value === '__household__' ? null : event.target.value)}>
                    <option value="__household__">家庭全体に立替</option>
                    {members.filter((member) => member.userId !== payerUserId).map((member) => <option key={member.userId} value={member.userId}>{getMemberLabel(member)}{member.userId === currentUser?.id ? '（自分）' : ''}</option>)}
                  </select>
                )} />
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 flex gap-2 border-t bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button type="button" variant="outline" className="min-h-11 flex-1 touch-manipulation" onClick={() => onOpenChange(false)} disabled={isSubmitting}>キャンセル</Button>
              {source.kind === 'create' && (
                <Button type="button" variant="outline" className="min-h-11 flex-1 touch-manipulation" disabled={isSubmitting} onClick={handleSubmit(save('continue'))}>{isSubmitting ? '保存中...' : '登録して続ける'}</Button>
              )}
              <Button type="button" className="min-h-11 flex-1 touch-manipulation" disabled={isSubmitting} onClick={handleSubmit(save('close'))}>{isSubmitting ? '保存中...' : isEditMode ? '更新する' : '登録して閉じる'}</Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
