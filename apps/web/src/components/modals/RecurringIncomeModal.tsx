/**
 * 定期収入登録モーダル
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
import type { RecurringIncome } from '@/types/transaction';
import {
  recurringIncomeSchema,
  type RecurringIncomeFormData,
  toRecurringIncomeFormData,
  toRecurringIncomeData,
} from '@/lib/validations/recurringIncome';
import { getCategoriesByType } from '@/constants/categories';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecurringIncomeStore } from '@/store/useRecurringIncomeStore';

/**
 * モーダルのプロパティ
 */
interface RecurringIncomeModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルの開閉を制御するコールバック */
  onOpenChange: (open: boolean) => void;
  /** 世帯ID */
  householdId: string;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 編集対象の定期収入（編集モード） */
  editingRecurringIncome?: RecurringIncome;
  /** 定期収入作成成功時のコールバック */
  onSuccess?: (recurringIncome: RecurringIncome) => Promise<void> | void;
}

/**
 * 会員名の表示
 */
function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

/**
 * 受取日の選択肢を生成
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
 * 定期収入登録モーダル
 */
export function RecurringIncomeModal({
  open,
  onOpenChange,
  householdId,
  members,
  editingRecurringIncome,
  onSuccess,
}: RecurringIncomeModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const addRecurringIncome = useRecurringIncomeStore((state) => state.addRecurringIncome);
  const updateRecurringIncome = useRecurringIncomeStore((state) => state.updateRecurringIncome);
  const isSubmitting = useRecurringIncomeStore((state) => state.isSubmitting);

  // モーダルが開いている間、bodyスクロールを無効化
  useBodyScrollLock(open);

  // 編集モードかどうか
  const isEditMode = !!editingRecurringIncome;

  // デフォルトの受取者（現在のユーザー）
  const defaultRecipientUserId = currentUser?.id || members[0]?.userId || '';

  // 収入カテゴリの選択肢
  const incomeCategories = getCategoriesByType('income');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecurringIncomeFormData>({
    resolver: zodResolver(recurringIncomeSchema) as Resolver<RecurringIncomeFormData>,
    defaultValues: {
      householdId,
      amount: 0,
      dayOfMonth: 25,
      category: 'salary',
      note: '',
      recipientUserId: defaultRecipientUserId,
      isActive: true,
    },
  });

  /**
   * 編集モードの場合、フォームに値を設定
   */
  useEffect(() => {
    if (isEditMode && editingRecurringIncome) {
      const formData = toRecurringIncomeFormData(editingRecurringIncome);
      reset(formData);
    } else {
      reset({
        householdId,
        amount: 0,
        dayOfMonth: 25,
        category: 'salary',
        note: '',
        recipientUserId: defaultRecipientUserId,
        isActive: true,
      });
    }
  }, [isEditMode, editingRecurringIncome, householdId, defaultRecipientUserId, reset]);

  /**
   * フォーム送信処理
   */
  const onSubmit: SubmitHandler<RecurringIncomeFormData> = async (formData) => {
    try {
      const recurringIncomeData = toRecurringIncomeData(formData);

      // 作成/更新の結果を保持し、onSuccess には常に有効な定期収入を渡す
      // （以前は新規作成時に undefined を渡していた）。
      let savedRecurringIncome: RecurringIncome;
      if (isEditMode && editingRecurringIncome) {
        savedRecurringIncome = await updateRecurringIncome(editingRecurringIncome.id, recurringIncomeData);
        toast.success('定期収入を更新しました');
      } else {
        savedRecurringIncome = await addRecurringIncome(recurringIncomeData);
        toast.success('定期収入を作成しました');
      }

      onOpenChange(false);
      await onSuccess?.(savedRecurringIncome);
    } catch (error) {
      console.error('定期収入保存エラー:', error);
      toast.error('定期収入の保存に失敗しました');
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
            {isEditMode ? '定期収入を編集' : '定期収入を追加'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? '定期収入の内容を編集できます。'
              : '毎月の給料などの定期収入を設定します。受取日にリマインダーが表示されます。'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 金額 */}
          <div className="space-y-2">
            <Label htmlFor="amount">金額（目安）*</Label>
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

          {/* 受取日 */}
          <div className="space-y-2">
            <Label htmlFor="dayOfMonth">受取日 *</Label>
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
            <p className="text-xs text-gray-500">
              この日以降、月次ビューにリマインダーが表示されます
            </p>
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
                  {incomeCategories.map((category) => (
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

          {/* 受取者 */}
          <div className="space-y-2">
            <Label htmlFor="recipientUserId">受取者 *</Label>
            <Controller
              name="recipientUserId"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="recipientUserId"
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
            {errors.recipientUserId && (
              <p className="text-sm text-red-600">{errors.recipientUserId.message}</p>
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
                  placeholder="給料、ボーナスなど"
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
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Label htmlFor="isActive" className="text-sm">
                      有効（無効にするとリマインダーが停止します）
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
