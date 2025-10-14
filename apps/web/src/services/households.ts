/**
 * 世帯管理サービス
 * 
 * 世帯の作成、取得、メンバー管理などの機能を提供します。
 * 
 * 注: Supabase型定義の制限により、一部any型を使用しています。
 * 将来的にはSupabase CLIで型を自動生成することを推奨します。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/lib/supabase/client';
import type { Household, HouseholdMember } from '@/types/household';

/**
 * 世帯を作成
 * 
 * @param name - 世帯名
 * @returns 作成された世帯情報
 * @throws エラーが発生した場合
 */
export async function createHousehold(name: string): Promise<Household> {
  const supabase = createClient();

  // デバッグ: セッション確認
  const { data: { session } } = await supabase.auth.getSession();
  console.log('現在のセッション:', {
    hasSession: !!session,
    userId: session?.user?.id,
  });

  const { data, error } = await supabase
    .from('households')
    .insert({
      name,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('世帯作成エラー:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      error: error,
    });
    throw new Error(`世帯の作成に失敗しました: ${error.message || '不明なエラー'}`);
  }

  return {
    id: (data as any).id,
    name: (data as any).name,
    ownerUserId: (data as any).owner_user_id,
    createdAt: (data as any).created_at,
    updatedAt: (data as any).updated_at,
  };
}

/**
 * ユーザーの所属する世帯を取得（MVP: 1世帯のみ）
 * 
 * @param userId - ユーザーID
 * @returns 世帯情報（所属していない場合はnull）
 * @throws エラーが発生した場合
 */
export async function getHousehold(userId: string): Promise<Household | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('household_members')
    .select(
      `
      household_id,
      households:household_id (
        id,
        name,
        owner_user_id,
        created_at,
        updated_at
      )
    `
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    // ユーザーが世帯に所属していない場合
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('世帯取得エラー:', error);
    throw new Error('世帯情報の取得に失敗しました');
  }

  if (!(data as any).households) {
    return null;
  }

  const household = Array.isArray((data as any).households)
    ? (data as any).households[0]
    : (data as any).households;

  return {
    id: household.id,
    name: household.name,
    ownerUserId: household.owner_user_id,
    createdAt: household.created_at,
    updatedAt: household.updated_at,
  };
}

/**
 * 世帯のメンバー一覧を取得
 * 
 * @param householdId - 世帯ID
 * @returns メンバー一覧
 * @throws エラーが発生した場合
 */
export async function getHouseholdMembers(
  householdId: string
): Promise<HouseholdMember[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('household_members')
    .select(
      `
      id,
      household_id,
      user_id,
      role,
      joined_at,
      profiles:user_id (
        email,
        name
      )
    `
    )
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('メンバー取得エラー:', error);
    throw new Error('メンバー情報の取得に失敗しました');
  }

  return (data as any[]).map((member: any) => ({
    id: member.id,
    householdId: member.household_id,
    userId: member.user_id,
    role: member.role as 'owner' | 'member',
    joinedAt: member.joined_at,
    profile: Array.isArray(member.profiles)
      ? member.profiles[0]
      : member.profiles,
  }));
}
