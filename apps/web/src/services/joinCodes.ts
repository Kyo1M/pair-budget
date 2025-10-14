/**
 * 参加コード管理サービス
 * 
 * 世帯への参加コードの発行・検証・使用機能を提供します。
 * 
 * 注: Supabase型定義の制限により、一部any型を使用しています。
 * 将来的にはSupabase CLIで型を自動生成することを推奨します。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/lib/supabase/client';
import type { JoinCode } from '@/types/household';

/**
 * 参加コード生成用の文字セット
 * 紛らわしい文字を除外: O, 0, I, 1, l
 */
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * 参加コードの桁数
 */
const CODE_LENGTH = 6;

/**
 * 参加コードの有効期限（時間）
 */
const CODE_EXPIRY_HOURS = 24;

/**
 * ランダムな参加コードを生成
 * 
 * @returns 6桁の参加コード
 */
function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARSET.length);
    code += CODE_CHARSET[randomIndex];
  }
  return code;
}

/**
 * 参加コードを発行
 * 
 * @param householdId - 世帯ID
 * @param createdBy - 作成者のユーザーID
 * @returns 作成された参加コード情報
 * @throws エラーが発生した場合
 */
export async function generateJoinCode(
  householdId: string,
  createdBy: string
): Promise<JoinCode> {
  const supabase = createClient();
  const code = generateRandomCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CODE_EXPIRY_HOURS);

  const { data, error } = await supabase
    .from('household_join_codes')
    .insert({
      household_id: householdId,
      code,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('参加コード発行エラー:', error);
    throw new Error('参加コードの発行に失敗しました');
  }

  return {
    id: (data as any).id,
    householdId: (data as any).household_id,
    code: (data as any).code,
    status: (data as any).status as 'active' | 'used' | 'expired' | 'revoked',
    expiresAt: (data as any).expires_at,
    createdBy: (data as any).created_by,
    usedBy: (data as any).used_by,
    usedAt: (data as any).used_at,
    createdAt: (data as any).created_at,
  };
}

/**
 * 参加コードを検証
 * 
 * @param code - 参加コード
 * @returns 検証結果と世帯情報
 * @throws エラーが発生した場合
 */
export async function validateJoinCode(code: string): Promise<{
  isValid: boolean;
  householdId?: string;
  householdName?: string;
  error?: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('household_join_codes')
    .select(
      `
      id,
      household_id,
      code,
      status,
      expires_at,
      households:household_id (
        name
      )
    `
    )
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) {
    return {
      isValid: false,
      error: '参加コードが見つかりません',
    };
  }

  // ステータスチェック
  if ((data as any).status !== 'active') {
    return {
      isValid: false,
      error: 'この参加コードは既に使用されています',
    };
  }

  // 有効期限チェック
  if (new Date((data as any).expires_at) < new Date()) {
    return {
      isValid: false,
      error: 'この参加コードは期限切れです',
    };
  }

  const household = Array.isArray((data as any).households)
    ? (data as any).households[0]
    : (data as any).households;

  return {
    isValid: true,
    householdId: (data as any).household_id,
    householdName: household?.name || '',
  };
}

/**
 * 参加コードを使用して世帯に参加
 * 
 * @param code - 参加コード
 * @param userId - 参加するユーザーID
 * @returns 参加した世帯のID
 * @throws エラーが発生した場合
 */
export async function consumeJoinCode(
  code: string,
  userId: string
): Promise<string> {
  const supabase = createClient();

  // コードを検証
  const validation = await validateJoinCode(code);
  if (!validation.isValid || !validation.householdId) {
    throw new Error(validation.error || '参加コードが無効です');
  }

  // 既に世帯に所属していないかチェック
  const { data: existingMember } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember) {
    throw new Error('既に世帯に所属しています');
  }

  // household_members に追加
  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: validation.householdId,
      user_id: userId,
      role: 'member',
    } as any);

  if (memberError) {
    console.error('メンバー追加エラー:', memberError);
    throw new Error('世帯への参加に失敗しました');
  }

  // コードを used ステータスに更新
  const { error: updateError } = await (supabase as any)
    .from('household_join_codes')
    .update({
      status: 'used',
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq('code', code.toUpperCase());

  if (updateError) {
    console.error('コード更新エラー:', updateError);
    // メンバー追加は成功しているので、警告のみ
    console.warn('参加コードのステータス更新に失敗しましたが、世帯への参加は完了しています');
  }

  return validation.householdId;
}

