/**
 * 定期支出サービス
 * 
 * 定期支出のCRUD操作とトランザクション自動生成機能を提供
 */

import { createClient } from '@/lib/supabase/client';
import type { RecurringExpense, RecurringExpenseData } from '@/types/transaction';

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
  const updateData: Record<string, any> = {};
  
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.payerUserId !== undefined) updateData.payer_user_id = data.payerUserId;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

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
function transformRecurringExpense(dbData: any): RecurringExpense {
  return {
    id: dbData.id,
    householdId: dbData.household_id,
    amount: dbData.amount,
    dayOfMonth: dbData.day_of_month,
    category: dbData.category,
    note: dbData.note,
    payerUserId: dbData.payer_user_id,
    isActive: dbData.is_active,
    createdBy: dbData.created_by,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
}
