/**
 * 世帯関連の型定義
 */

/**
 * 世帯情報
 */
export interface Household {
  /** 世帯ID */
  id: string;
  /** 世帯名 */
  name: string;
  /** オーナーのユーザーID */
  ownerUserId: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/**
 * 世帯メンバー情報
 */
export interface HouseholdMember {
  /** メンバーID */
  id: string;
  /** 世帯ID */
  householdId: string;
  /** ユーザーID */
  userId: string;
  /** ロール */
  role: 'owner' | 'member';
  /** 参加日時 */
  joinedAt: string;
  /** ユーザー情報（プロフィール） */
  profile?: {
    /** メールアドレス */
    email: string;
    /** 名前 */
    name: string | null;
  };
}

/**
 * 参加コード情報
 */
export interface JoinCode {
  /** コードID */
  id: string;
  /** 世帯ID */
  householdId: string;
  /** コード */
  code: string;
  /** ステータス */
  status: 'active' | 'used' | 'expired' | 'revoked';
  /** 有効期限 */
  expiresAt: string;
  /** 作成者ID */
  createdBy: string;
  /** 使用者ID */
  usedBy: string | null;
  /** 使用日時 */
  usedAt: string | null;
  /** 作成日時 */
  createdAt: string;
}

