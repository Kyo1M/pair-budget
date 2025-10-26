/**
 * 取引管理サービス
 * 
 * 取引の取得・作成・削除を行います。
 * Supabase の transactions テーブルを操作します。
 */

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import {
  TRANSACTION_CATEGORY_KEYS,
  type Transaction,
  type TransactionCategoryKey,
  type TransactionData,
} from '@/types/transaction';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];

const TRANSACTION_SELECT = `
  id,
  household_id,
  type,
  amount,
  occurred_on,
  category,
  note,
  payer_user_id,
  advance_to_user_id,
  created_by,
  created_at,
  updated_at
`;

const CATEGORY_KEY_SET = new Set<string>(TRANSACTION_CATEGORY_KEYS);

/**
 * Supabase の Row データをアプリ用の型に整形
 * 
 * @param row - Supabase Row
 * @returns Transaction
 */
function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    householdId: row.household_id,
    type: row.type,
    amount: typeof row.amount === 'string' ? Number(row.amount) : row.amount,
    occurredOn: row.occurred_on,
    category: normalizeCategory(row.category),
    note: row.note,
    payerUserId: row.payer_user_id,
    advanceToUserId: row.advance_to_user_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * カテゴリキーを安全に整形
 * 
 * @param value - カテゴリ文字列
 * @returns 取引カテゴリキーまたはnull
 */
function normalizeCategory(value: string | null): TransactionCategoryKey | null {
  if (!value) {
    return null;
  }
  return CATEGORY_KEY_SET.has(value) ? (value as TransactionCategoryKey) : null;
}

/**
 * 月指定の文字列 (YYYY-MM) から日付範囲を算出
 * 
 * @param month - YYYY-MM 形式の文字列
 * @returns 月初と月末の日付
 */
function getMonthDateRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error('月は YYYY-MM 形式で指定してください');
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]);

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    throw new Error('月は YYYY-MM 形式で指定してください');
  }

  const lastDay = new Date(year, monthIndex, 0).getDate();
  const paddedMonth = match[2];

  return {
    startDate: `${match[1]}-${paddedMonth}-01`,
    endDate: `${match[1]}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
  };
}

/**
 * 取引一覧を取得
 * 
 * @param householdId - 世帯ID
 * @param month - 月 (YYYY-MM) 任意
 * @returns 取引一覧
 */
export async function getTransactions(
  householdId: string,
  month?: string
): Promise<Transaction[]> {
  const supabase = createClient();

  let query = supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('household_id', householdId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (month) {
    try {
      const { startDate, endDate } = getMonthDateRange(month);
      query = query.gte('occurred_on', startDate).lte('occurred_on', endDate);
    } catch (error) {
      console.error('取引取得エラー: 月指定が不正です', error);
      throw error;
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('取引取得エラー:', error);
    throw new Error('取引の取得に失敗しました');
  }

  return (data as TransactionRow[]).map(mapTransaction);
}

/**
 * 指定期間の取引を取得
 *
 * @param householdId - 世帯ID
 * @param startDate - 開始日 (YYYY-MM-DD)
 * @param endDate - 終了日 (YYYY-MM-DD)
 * @returns 取引一覧
 */
export async function getTransactionsByDateRange(
  householdId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('household_id', householdId)
    .gte('occurred_on', startDate)
    .lte('occurred_on', endDate)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('期間指定取引取得エラー:', error);
    throw new Error('取引の取得に失敗しました');
  }

  const rows = (data ?? []) as TransactionRow[];
  return rows.map(mapTransaction);
}

/**
 * 最近の取引を取得
 * 
 * @param householdId - 世帯ID
 * @param limit - 件数
 * @returns 最近の取引一覧
 */
export async function getRecentTransactions(
  householdId: string,
  limit: number
): Promise<Transaction[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('household_id', householdId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(Math.max(limit, 1));

  if (error) {
    console.error('最近の取引取得エラー:', error);
    throw new Error('最近の取引の取得に失敗しました');
  }

  return (data as TransactionRow[]).map(mapTransaction);
}

/**
 * 取引を作成
 * 
 * @param input - 取引データ
 * @returns 作成された取引
 */
export async function createTransaction(input: TransactionData): Promise<Transaction> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('認証されていません。ログインしてください。');
  }

  const payload: Database['public']['Tables']['transactions']['Insert'] = {
    household_id: input.householdId,
    type: input.type,
    amount: input.amount,
    occurred_on: input.occurredOn,
    category: input.category,
    note: input.note?.trim() ? input.note.trim() : null,
    payer_user_id: input.payerUserId ?? null,
    advance_to_user_id: input.type === 'advance' ? input.advanceToUserId ?? null : null,
    created_by: session.user.id,
  };

  // @supabase/ssr型定義の問題により型アサーション使用
  // TODO: Supabase CLIで型定義を自動生成し、as anyを削除する (チケット: PB-66)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transactions')
    .insert([payload])
    .select(TRANSACTION_SELECT)
    .single();

  if (error) {
    console.error('取引作成エラー:', error);
    throw new Error('取引の作成に失敗しました');
  }

  return mapTransaction(data as TransactionRow);
}

/**
 * 取引を削除
 * 
 * @param id - 取引ID
 */
export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('認証されていません。ログインしてください。');
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('取引削除エラー:', error);
    throw new Error('取引の削除に失敗しました');
  }
}

/**
 * 取引を更新
 * 
 * @param id - 取引ID
 * @param input - 更新データ（部分的な更新が可能）
 * @returns 更新された取引
 */
export async function updateTransaction(
  id: string,
  input: Partial<TransactionData>
): Promise<Transaction> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('認証されていません。ログインしてください。');
  }

  const payload: Partial<Database['public']['Tables']['transactions']['Update']> = {};

  if (input.amount !== undefined) {
    payload.amount = input.amount;
  }
  if (input.occurredOn !== undefined) {
    payload.occurred_on = input.occurredOn;
  }
  if (input.category !== undefined) {
    payload.category = input.category;
  }
  if (input.note !== undefined) {
    payload.note = input.note?.trim() ? input.note.trim() : null;
  }
  if (input.payerUserId !== undefined) {
    payload.payer_user_id = input.payerUserId ?? null;
  }
  if (input.type !== undefined) {
    payload.type = input.type;
    // タイプがadvance以外の場合は立替先をクリア
    if (input.type !== 'advance' && input.advanceToUserId !== undefined) {
      payload.advance_to_user_id = null;
    }
  }
  if (input.advanceToUserId !== undefined && input.type === 'advance') {
    payload.advance_to_user_id = input.advanceToUserId ?? null;
  }

  // @supabase/ssr型定義の問題により型アサーション使用
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select(TRANSACTION_SELECT)
    .single();

  if (error) {
    console.error('取引更新エラー:', error);
    throw new Error('取引の更新に失敗しました');
  }

  return mapTransaction(data as TransactionRow);
}
