/**
 * 精算関連サービス
 * 
 * 立替残高の取得などの機能を提供します。
 */

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import type {
  BalanceSettlementData,
  HouseholdBalance,
  HouseholdBalanceBreakdown,
  Settlement,
  SettlementData,
} from '@/types/settlement';

type BalanceBreakdownRow =
  Database['public']['Functions']['get_household_balance_breakdown']['Returns'][number];
type SettlementRow = Database['public']['Tables']['settlements']['Row'];
type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];

const SETTLEMENT_SELECT = `
  id,
  household_id,
  from_user_id,
  to_user_id,
  amount,
  settled_on,
  note,
  created_by,
  created_at
`;

/**
 * SupabaseのRowをアプリ用の型に変換
 */
function mapSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    householdId: row.household_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amount: typeof row.amount === 'string' ? Number(row.amount) : row.amount,
    settledOn: row.settled_on,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * 世帯内の立替残高を取得
 * 
 * @param householdId - 世帯ID
 * @returns 残高一覧
 */
export async function getHouseholdBalances(
  householdId: string
): Promise<HouseholdBalance[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_household_balance_breakdown', {
    target_household: householdId,
  });

  if (error) {
    console.error('立替残高取得エラー:', error);
    throw new Error('立替残高の取得に失敗しました');
  }

  return groupBalanceBreakdowns((data ?? []) as BalanceBreakdownRow[]);
}

/** RPCの明細行をメンバー単位にまとめる純粋変換。 */
export function groupBalanceBreakdowns(rows: BalanceBreakdownRow[]): HouseholdBalance[] {
  const byUser = new Map<string, HouseholdBalance>();

  rows.forEach((item) => {
    const detail: HouseholdBalanceBreakdown = {
      subjectUserId: item.subject_user_id,
      subjectUserName: item.subject_user_name,
      counterpartyUserId: item.counterparty_user_id,
      counterpartyUserName: item.counterparty_user_name,
      balanceAmount: Number(item.balance_amount),
      isOverSettled: item.is_over_settled,
    };
    const current = byUser.get(detail.subjectUserId) ?? {
      userId: detail.subjectUserId,
      userName: detail.subjectUserName,
      balanceAmount: 0,
      breakdowns: [],
    };
    current.balanceAmount += detail.balanceAmount;
    current.breakdowns.push(detail);
    byUser.set(detail.subjectUserId, current);
  });

  return Array.from(byUser.values());
}

/** 残高明細に対する精算を、DB側の残高検証付きで作成する。 */
export async function createBalanceSettlement(
  input: BalanceSettlementData
): Promise<Settlement> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_balance_settlement', {
    target_household: input.householdId,
    target_subject_user: input.subjectUserId,
    target_counterparty_user: input.counterpartyUserId,
    target_amount: input.amount,
    target_settled_on: input.settledOn,
    target_note: input.note?.trim() ? input.note.trim() : null,
  });

  if (error) {
    console.error('残高精算作成エラー:', error);
    if (error.message.includes('exceeds the outstanding balance')) {
      throw new Error('精算額が現在の立替残高を超えています');
    }
    if (error.message.includes('no outstanding balance')) {
      throw new Error('精算できる立替残高がありません');
    }
    throw new Error('精算の記録に失敗しました');
  }

  const row = data?.[0];
  if (!row) {
    throw new Error('精算結果を取得できませんでした');
  }
  return mapSettlement(row);
}

/**
 * 精算履歴を取得
 * 
 * @param householdId - 世帯ID
 * @returns 精算一覧
 */
export async function getSettlements(householdId: string): Promise<Settlement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .eq('household_id', householdId)
    .order('settled_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('精算取得エラー:', error);
    throw new Error('精算履歴の取得に失敗しました');
  }

  return (data as SettlementRow[]).map(mapSettlement);
}

/**
 * 精算を作成
 * 
 * @param input - 精算データ
 * @returns 作成された精算
 */
export async function createSettlement(input: SettlementData): Promise<Settlement> {
  const supabase = createClient();

  const { data: sessionResult } = await supabase.auth.getSession();
  const sessionUserId = sessionResult.session?.user?.id;

  if (!sessionUserId) {
    throw new Error('認証されていません。ログインしてください。');
  }

  if (!input.fromUserId && !input.toUserId) {
    throw new Error('精算の送り手または受け手が指定されていません');
  }

  if (
    input.fromUserId &&
    input.toUserId &&
    input.fromUserId === input.toUserId
  ) {
    throw new Error('同じユーザー同士では精算できません');
  }

  const payload: SettlementInsert = {
    household_id: input.householdId,
    from_user_id: input.fromUserId ?? null,
    to_user_id: input.toUserId ?? null,
    amount: input.amount,
    settled_on: input.settledOn,
    note: input.note?.trim() ? input.note.trim() : null,
    created_by: sessionUserId,
  };

  // @supabase/ssr型定義の問題により型アサーション使用
  // TODO: Supabase CLIで型定義を自動生成し、as anyを削除する (チケット: PB-66)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('settlements')
    .insert([payload])
    .select(SETTLEMENT_SELECT)
    .single();

  if (error) {
    console.error('精算作成エラー:', error);
    throw new Error('精算の記録に失敗しました');
  }

  return mapSettlement(data as SettlementRow);
}

/**
 * 精算を削除
 * 
 * @param id - 精算ID
 */
export async function deleteSettlement(id: string): Promise<void> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('精算削除エラー:', error);
    throw new Error('精算の削除に失敗しました');
  }

  if (!data || data.length === 0) {
    throw new Error('精算を削除できませんでした（対象が見つからないか、権限がありません）');
  }
}
