/**
 * 定期支出サービス
 * 
 * 定期支出のCRUD操作とトランザクション自動生成機能を提供
 */

import { createClient } from '@/lib/supabase/client';
import type {
  RecurringExpense,
  RecurringExpenseData,
  ExpenseCategoryKey,
  RecurringExpenseType,
  VariableExpenseReminder,
} from '@/types/transaction';

/**
 * Supabaseクライアントインスタンス
 */
const supabase = createClient();

/**
 * 定期支出一覧を取得
 * 
 * @param householdId - 世帯ID
 * @returns 定期支出一覧
 */
export async function listRecurringExpenses(householdId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('定期支出一覧取得エラー:', error);
    throw new Error('定期支出一覧の取得に失敗しました');
  }

  return data.map(transformRecurringExpense);
}

/**
 * 定期支出を作成
 * 
 * @param data - 定期支出データ
 * @returns 作成された定期支出
 */
export async function createRecurringExpense(data: RecurringExpenseData): Promise<RecurringExpense> {
  console.log('Creating recurring expense with data:', data);
  
  // 現在のユーザーIDを取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証が必要です');
  }
  
  const { data: result, error } = await supabase
    .from('recurring_expenses')
    .insert({
      household_id: data.householdId,
      amount: data.amount,
      day_of_month: data.dayOfMonth,
      category: data.category,
      note: data.note,
      payer_user_id: data.payerUserId,
      is_active: data.isActive ?? true,
      expense_type: data.expenseType,
      created_by: user.id, // 明示的にcreated_byを設定
    })
    .select()
    .single();

  if (error) {
    console.error('定期支出作成エラー詳細:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`定期支出の作成に失敗しました: ${error.message}`);
  }

  return transformRecurringExpense(result);
}

/**
 * 定期支出を更新
 * 
 * @param id - 定期支出ID
 * @param data - 更新データ
 * @returns 更新された定期支出
 */
export async function updateRecurringExpense(
  id: string,
  data: Partial<RecurringExpenseData>
): Promise<RecurringExpense> {
  const updateData: Record<string, unknown> = {};

  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.payerUserId !== undefined) updateData.payer_user_id = data.payerUserId;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.expenseType !== undefined) updateData.expense_type = data.expenseType;

  const { data: result, error } = await supabase
    .from('recurring_expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('定期支出更新エラー:', error);
    throw new Error('定期支出の更新に失敗しました');
  }

  return transformRecurringExpense(result);
}

/**
 * 定期支出を削除
 * 
 * @param id - 定期支出ID
 */
export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('定期支出削除エラー:', error);
    throw new Error('定期支出の削除に失敗しました');
  }
}

/**
 * 指定月の未作成トランザクションを生成
 * 
 * @param householdId - 世帯ID
 * @param targetMonth - 対象月 (YYYY-MM形式)
 * @returns 生成されたトランザクション数
 */
export async function generateMissingTransactions(
  householdId: string,
  targetMonth: string
): Promise<number> {
  // 現在のユーザーIDを取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証が必要です');
  }

  const { data, error } = await supabase.rpc('generate_recurring_transactions', {
    target_household: householdId,
    target_month: targetMonth,
  });

  if (error) {
    console.error('定期支出トランザクション生成エラー:', error);
    throw new Error('定期支出からのトランザクション生成に失敗しました');
  }

  return data || 0;
}

/**
 * データベースの定期支出データをアプリケーションの型に変換
 * 
 * @param dbData - データベースの定期支出データ
 * @returns アプリケーションの定期支出データ
 */
function transformRecurringExpense(dbData: Record<string, unknown>): RecurringExpense {
  return {
    id: dbData.id as string,
    householdId: dbData.household_id as string,
    amount: dbData.amount as number,
    dayOfMonth: dbData.day_of_month as number,
    category: dbData.category as ExpenseCategoryKey,
    note: dbData.note as string | null,
    payerUserId: dbData.payer_user_id as string,
    isActive: dbData.is_active as boolean,
    expenseType: (dbData.expense_type as RecurringExpenseType) || 'fixed',
    createdBy: dbData.created_by as string,
    createdAt: dbData.created_at as string,
    updatedAt: dbData.updated_at as string,
  };
}

/**
 * 固定費トランザクションを日付ベースで生成
 *
 * @param householdId - 世帯ID
 * @param targetDate - 対象日 (YYYY-MM-DD形式、省略時は当日)
 * @returns 生成されたトランザクション数
 */
export async function generateFixedTransactionsByDate(
  householdId: string,
  targetDate?: string
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証が必要です');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('generate_fixed_transactions_by_date', {
    target_household: householdId,
    target_date: targetDate || new Date().toISOString().split('T')[0],
  });

  if (error) {
    console.error('固定費トランザクション生成エラー:', error);
    throw new Error('固定費の自動生成に失敗しました');
  }

  return data || 0;
}

/**
 * 変動費リマインダーを取得
 *
 * @param householdId - 世帯ID
 * @param targetDate - 対象日 (YYYY-MM-DD形式、省略時は当日)
 * @returns 変動費リマインダー一覧
 */
export async function getVariableExpenseReminders(
  householdId: string,
  targetDate?: string
): Promise<VariableExpenseReminder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証が必要です');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_variable_expense_reminders', {
    target_household: householdId,
    target_date: targetDate || new Date().toISOString().split('T')[0],
  });

  if (error) {
    console.error('変動費リマインダー取得エラー:', error);
    throw new Error('変動費リマインダーの取得に失敗しました');
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    amount: item.amount as number,
    dayOfMonth: item.day_of_month as number,
    category: item.category as ExpenseCategoryKey,
    note: item.note as string | null,
    payerUserId: item.payer_user_id as string,
  }));
}
