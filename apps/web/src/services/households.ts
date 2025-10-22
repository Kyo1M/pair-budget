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

  // セッション確認
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('認証されていません。ログインしてください。');
  }

  const userId = session.user.id;

  console.log('世帯作成開始:', { userId, householdName: name });
  console.log('セッション情報:', {
    accessToken: session.access_token ? '存在する' : '存在しない',
    expiresAt: session.expires_at,
  });

  // owner_user_idを明示的に設定してRLS問題を回避
  const { data: householdData, error: householdError } = await supabase
    .from('households')
    .insert({
      name,
      owner_user_id: userId,
    } as any)
    .select()
    .single();

  console.log('世帯作成リクエスト後の詳細:', {
    hasData: !!householdData,
    hasError: !!householdError,
    errorCode: householdError?.code,
  });

  if (householdError) {
    console.error('世帯作成エラー:', {
      message: householdError.message,
      details: householdError.details,
      hint: householdError.hint,
      code: householdError.code,
    });
    throw new Error(`世帯の作成に失敗しました: ${householdError.message || '不明なエラー'}`);
  }

  console.log('世帯作成成功:', householdData);

  return {
    id: (householdData as any).id,
    name: (householdData as any).name,
    ownerUserId: (householdData as any).owner_user_id,
    createdAt: (householdData as any).created_at,
    updatedAt: (householdData as any).updated_at,
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

  // 外部キー結合の正しい構文: households(columns)
  const { data, error } = await supabase
    .from('household_members')
    .select(
      `
      household_id,
      households (
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

  // 外部キー結合の正しい構文: profiles(columns)
  const { data, error } = await supabase
    .from('household_members')
    .select(
      `
      id,
      household_id,
      user_id,
      role,
      joined_at,
      profiles (
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
