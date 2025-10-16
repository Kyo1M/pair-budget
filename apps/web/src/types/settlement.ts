/**
 * 精算関連の型定義
 */

/**
 * 世帯内の立替残高情報
 */
export interface HouseholdBalance {
  /** ユーザーID */
  userId: string;
  /** ユーザー名 */
  userName: string | null;
  /** 残高金額 (プラス: 受け取る, マイナス: 支払う) */
  balanceAmount: number;
}
