/**
 * 定期収入サービス
 *
 * 定期収入のCRUD操作とリマインダー機能を提供
 */

import { createClient } from '@/lib/supabase/client';
import { formatLocalDate } from '@/lib/utils';
import type {
  RecurringIncome,
  RecurringIncomeData,
  IncomeCategoryKey,
  IncomeReminder,
} from '@/types/transaction';

/**
 * Supabaseクライアントインスタンス
 */
const supabase = createClient();

/**
 * 定期収入一覧を取得
 *
 * @param householdId - 世帯ID
 * @returns 定期収入一覧
 */
export async function listRecurringIncomes(householdId: string): Promise<RecurringIncome[]> {
  const { data, error } = await supabase
    .from('recurring_incomes')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('定期収入一覧取得エラー:', error);
    throw new Error('定期収入一覧の取得に失敗しました');
  }

  return data.map(transformRecurringIncome);
}

/**
 * 定期収入を作成
 *
 * @param data - 定期収入データ
 * @returns 作成された定期収入
 */
export async function createRecurringIncome(data: RecurringIncomeData): Promise<RecurringIncome> {
  // 現在のユーザーIDを取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証が必要です');
  }

  const { data: result, error } = await supabase
    .from('recurring_incomes')
    .insert({
      household_id: data.householdId,
      amount: data.amount,
      day_of_month: data.dayOfMonth,
      category: data.category,
      note: data.note,
      recipient_user_id: data.recipientUserId,
      is_active: data.isActive ?? true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('定期収入作成エラー:', error);
    throw new Error(`定期収入の作成に失敗しました: ${error.message}`);
  }

  return transformRecurringIncome(result);
}

/**
 * 定期収入を更新
 *
 * @param id - 定期収入ID
 * @param data - 更新データ
 * @returns 更新された定期収入
 */
export async function updateRecurringIncome(
  id: string,
  data: Partial<RecurringIncomeData>
): Promise<RecurringIncome> {
  const updateData: Record<string, unknown> = {};

  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.recipientUserId !== undefined) updateData.recipient_user_id = data.recipientUserId;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  const { data: result, error } = await supabase
    .from('recurring_incomes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('定期収入更新エラー:', error);
    throw new Error('定期収入の更新に失敗しました');
  }

  return transformRecurringIncome(result);
}

/**
 * 定期収入を削除
 *
 * @param id - 定期収入ID
 */
export async function deleteRecurringIncome(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_incomes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('定期収入削除エラー:', error);
    throw new Error('定期収入の削除に失敗しました');
  }
}

/**
 * 収入リマインダーを取得
 *
 * @param householdId - 世帯ID
 * @param targetDate - 対象日 (YYYY-MM-DD形式、省略時は当日)
 * @returns 収入リマインダー一覧
 */
export async function getIncomeReminders(
  householdId: string,
  targetDate?: string
): Promise<IncomeReminder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証が必要です');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_income_reminders', {
    target_household: householdId,
    // ローカル日付を渡す（toISOString は UTC のため JST 早朝に前日扱いになる）
    target_date: targetDate || formatLocalDate(),
  });

  if (error) {
    console.error('収入リマインダー取得エラー:', error);
    throw new Error('収入リマインダーの取得に失敗しました');
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    amount: Number(item.amount),
    dayOfMonth: item.day_of_month as number,
    category: item.category as IncomeCategoryKey,
    note: item.note as string | null,
    recipientUserId: item.recipient_user_id as string,
  }));
}

/** 今月分の収入リマインダーを非表示にする。 */
export async function dismissRecurringIncomeReminder(
  recurringIncomeId: string,
  targetDate = formatLocalDate()
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  const periodMonth = `${targetDate.slice(0, 7)}-01`;
  const { error } = await supabase.from('recurring_reminder_dismissals').insert({
    recurring_expense_id: null,
    recurring_income_id: recurringIncomeId,
    period_month: periodMonth,
    dismissed_by: user.id,
  });

  if (error && error.code !== '23505') {
    console.error('収入リマインダー非表示エラー:', error);
    throw new Error('リマインダーを非表示にできませんでした');
  }
}

/**
 * データベースの定期収入データをアプリケーションの型に変換
 *
 * @param dbData - データベースの定期収入データ
 * @returns アプリケーションの定期収入データ
 */
function transformRecurringIncome(dbData: Record<string, unknown>): RecurringIncome {
  return {
    id: dbData.id as string,
    householdId: dbData.household_id as string,
    amount: Number(dbData.amount),
    dayOfMonth: dbData.day_of_month as number,
    category: dbData.category as IncomeCategoryKey,
    note: dbData.note as string | null,
    recipientUserId: dbData.recipient_user_id as string,
    isActive: dbData.is_active as boolean,
    createdBy: dbData.created_by as string,
    // created_at / updated_at は DB 型上 nullable のため、null フォールバックを用意
    createdAt: (dbData.created_at as string | null) ?? new Date().toISOString(),
    updatedAt: (dbData.updated_at as string | null) ?? new Date().toISOString(),
  };
}
