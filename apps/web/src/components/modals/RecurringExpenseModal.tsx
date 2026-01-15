/**
 * 定期支出登録モーダル
 */

'use client';

import { useEffect } from 'react';
import { Controller, type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
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
import type { HouseholdMember } from '@/types/household';
import type { RecurringExpense } from '@/types/transaction';
import {
  recurringExpenseSchema,
  type RecurringExpenseFormData,
  toRecurringExpenseFormData,
  toRecurringExpenseData,
} from '@/lib/validations/recurringExpense';
import { getCategoriesByType } from '@/constants/categories';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';

/**
 * モーダルのプロパティ
 */
interface RecurringExpenseModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルの開閉を制御するコールバック */
  onOpenChange: (open: boolean) => void;
  /** 世帯ID */
  householdId: string;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 編集対象の定期支出（編集モード） */
  editingRecurringExpense?: RecurringExpense;
  /** 定期支出作成成功時のコールバック */
  onSuccess?: (recurringExpense: RecurringExpense) => Promise<void> | void;
}

/**
 * 会員名の表示
 */
function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

/**
 * 支払日の選択肢を生成
 */
function generateDayOptions(): Array<{ value: number; label: string }> {
  const options = [];
  for (let day = 1; day <= 31; day++) {
    options.push({
      value: day,
      label: `${day}日`,
    });
  }
  return options;
}

/**
 * 定期支出登録モーダル
 */
export function RecurringExpenseModal({
  open,
  onOpenChange,
  householdId,
  members,
  editingRecurringExpense,
  onSuccess,
}: RecurringExpenseModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const addRecurringExpense = useRecurringExpenseStore((state) => state.addRecurringExpense);
  const updateRecurringExpense = useRecurringExpenseStore((state) => state.updateRecurringExpense);
  const isSubmitting = useRecurringExpenseStore((state) => state.isSubmitting);

  // モーダルが開いている間、bodyスクロールを無効化
  useBodyScrollLock(open);

  // 編集モードかどうか
  const isEditMode = !!editingRecurringExpense;

  // デフォルトの支払者（現在のユーザー）
  const defaultPayerUserId = currentUser?.id || members[0]?.userId || '';

  // 支出カテゴリの選択肢
  const expenseCategories = getCategoriesByType('expense');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RecurringExpenseFormData>({
    resolver: zodResolver(recurringExpenseSchema) as Resolver<RecurringExpenseFormData>,
    defaultValues: {
      householdId,
      amount: 0,
      dayOfMonth: 1,
      category: 'fixed',
      note: '',
      payerUserId: defaultPayerUserId,
      isActive: true,
      expenseType: 'fixed',
    },
  });

  // 種類の監視（説明文の動的表示用）
  const expenseType = watch('expenseType');

  /**
   * 編集モードの場合、フォームに値を設定
   */
  useEffect(() => {
    if (isEditMode && editingRecurringExpense) {
      const formData = toRecurringExpenseFormData(editingRecurringExpense);
      reset(formData);
    } else {
      reset({
        householdId,
        amount: 0,
        dayOfMonth: 1,
        category: 'fixed',
        note: '',
        payerUserId: defaultPayerUserId,
        isActive: true,
        expenseType: 'fixed',
      });
    }
  }, [isEditMode, editingRecurringExpense, householdId, defaultPayerUserId, reset]);

  /**
   * フォーム送信処理
   */
  const onSubmit: SubmitHandler<RecurringExpenseFormData> = async (formData) => {
    try {
      console.log('Form data:', formData);
      const recurringExpenseData = toRecurringExpenseData(formData);
      console.log('Transformed data:', recurringExpenseData);

      if (isEditMode && editingRecurringExpense) {
        await updateRecurringExpense(editingRecurringExpense.id, recurringExpenseData);
        toast.success('定期支出を更新しました');
      } else {
        await addRecurringExpense(recurringExpenseData);
        toast.success('定期支出を作成しました');
      }

      onOpenChange(false);
      await onSuccess?.(editingRecurringExpense!);
    } catch (error) {
      console.error('定期支出保存エラー:', error);
      toast.error('定期支出の保存に失敗しました');
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const dayOptions = generateDayOptions();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '定期支出を編集' : '定期支出を追加'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? '定期支出の内容を編集できます。'
              : '毎月自動で登録される定期支出を設定します。'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 種類（固定費/変動費） */}
          <div className="space-y-2">
            <Label>種類 *</Label>
            <Controller
              name="expenseType"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="fixed"
                        checked={field.value === 'fixed'}
                        onChange={() => field.onChange('fixed')}
                        className="h-4 w-4"
                      />
                      <span>固定費</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="variable"
                        checked={field.value === 'variable'}
                        onChange={() => field.onChange('variable')}
                        className="h-4 w-4"
                      />
                      <span>変動費</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {expenseType === 'fixed'
                      ? '指定日に自動で支出として登録されます（家賃など）'
                      : '指定日にリマインダーが表示され、手動で入力します（水道代など）'}
                  </p>
                </div>
              )}
            />
          </div>

          {/* 金額 */}
          <div className="space-y-2">
            <Label htmlFor="amount">金額 {expenseType === 'fixed' ? '*' : '(目安)'}</Label>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="amount"
                  type="number"
                  placeholder="金額を入力"
                  min="0"
                  step="1"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                />
              )}
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          {/* 支払日 */}
          <div className="space-y-2">
            <Label htmlFor="dayOfMonth">支払日 *</Label>
            <Controller
              name="dayOfMonth"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="dayOfMonth"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                >
                  {dayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.dayOfMonth && (
              <p className="text-sm text-red-600">{errors.dayOfMonth.message}</p>
            )}
          </div>

          {/* カテゴリ */}
          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ *</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {expenseCategories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* 支払者 */}
          <div className="space-y-2">
            <Label htmlFor="payerUserId">支払者 *</Label>
            <Controller
              name="payerUserId"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="payerUserId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {getMemberLabel(member)}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.payerUserId && (
              <p className="text-sm text-red-600">{errors.payerUserId.message}</p>
            )}
          </div>

          {/* メモ */}
          <div className="space-y-2">
            <Label htmlFor="note">メモ</Label>
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="note"
                  placeholder="家賃、光熱費など"
                  maxLength={500}
                />
              )}
            />
            {errors.note && (
              <p className="text-sm text-red-600">{errors.note.message}</p>
            )}
          </div>

          {/* 有効/無効（編集時のみ） */}
          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="isActive">状態</Label>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <input
                      id="isActive"
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="isActive" className="text-sm">
                      有効（無効にすると自動生成が停止します）
                    </Label>
                  </div>
                )}
              />
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : isEditMode ? '更新' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
