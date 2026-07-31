/**
 * 精算関連の型定義
 */

/**
 * 精算記録データ（作成時に使用）
 */
export interface SettlementData {
  /** 世帯ID */
  householdId: string;
  /** 支払ったユーザーID */
  fromUserId: string | null;
  /** 受け取ったユーザーID */
  toUserId: string | null;
  /** 金額 */
  amount: number;
  /** 精算日 (YYYY-MM-DD) */
  settledOn: string;
  /** メモ */
  note?: string | null;
}

/**
 * 精算記録
 */
export interface Settlement {
  /** 精算ID */
  id: string;
  /** 世帯ID */
  householdId: string;
  /** 支払ったユーザーID */
  fromUserId: string | null;
  /** 受け取ったユーザーID */
  toUserId: string | null;
  /** 金額 */
  amount: number;
  /** 精算日 */
  settledOn: string;
  /** メモ */
  note: string | null;
  /** 作成者ユーザーID */
  createdBy: string;
  /** 作成日時 */
  createdAt: string;
}

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
  /** 相手別の残高明細 */
  breakdowns: HouseholdBalanceBreakdown[];
}

/**
 * 相手別の立替残高。
 * counterpartyUserId が null の場合は世帯全体との残高を表す。
 */
export interface HouseholdBalanceBreakdown {
  subjectUserId: string;
  subjectUserName: string | null;
  counterpartyUserId: string | null;
  counterpartyUserName: string | null;
  /** プラス: 対象者が受け取る、マイナス: 対象者が支払う */
  balanceAmount: number;
  /** 過去の精算が元の立替残高を超えて反対符号になっている */
  isOverSettled: boolean;
}

/** 残高明細に対する安全な精算入力 */
export interface BalanceSettlementData {
  householdId: string;
  subjectUserId: string;
  counterpartyUserId: string | null;
  amount: number;
  settledOn: string;
  note?: string | null;
}
