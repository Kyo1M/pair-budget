/**
 * 精算関連サービス
 * 
 * 立替残高の取得などの機能を提供します。
 */

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import type { HouseholdBalance } from '@/types/settlement';

type BalanceRow =
  Database['public']['Functions']['get_household_balances']['Returns'][number];

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

  const { data, error } = await supabase.rpc('get_household_balances', {
    target_household: householdId,
  });

  if (error) {
    console.error('立替残高取得エラー:', error);
    throw new Error('立替残高の取得に失敗しました');
  }

  return (data ?? []).map((item: BalanceRow) => ({
    userId: item.user_id,
    userName: item.user_name,
    balanceAmount:
      typeof item.balance_amount === 'string'
        ? Number(item.balance_amount)
        : item.balance_amount,
  }));
}
