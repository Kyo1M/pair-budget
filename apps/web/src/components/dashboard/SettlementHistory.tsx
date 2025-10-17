/**
 * 精算履歴表示コンポーネント
 * 
 * MVPでは非表示だが、今後の拡張に備えて用意しておく。
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HouseholdMember } from '@/types/household';
import type { Settlement } from '@/types/settlement';

interface SettlementHistoryProps {
  /** 精算履歴 */
  settlements: Settlement[];
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 現在のユーザーID */
  currentUserId?: string;
  /** 任意クラス */
  className?: string;
}

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

/**
 * ユーザー表示名の取得
 */
function resolveMemberName(
  userId: string | null,
  members: HouseholdMember[],
  currentUserId?: string
): string {
  if (!userId) {
    return '世帯全体';
  }
  if (userId === currentUserId) {
    return 'あなた';
  }

  const member = members.find((item) => item.userId === userId);
  return member?.profile?.name || member?.profile?.email || '不明なメンバー';
}

export function SettlementHistory({
  settlements,
  members,
  currentUserId,
  className,
}: SettlementHistoryProps) {
  if (!settlements.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>精算履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">まだ精算は記録されていません。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>精算履歴</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement) => (
          <div
            key={settlement.id}
            className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3 text-sm md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold">
                {resolveMemberName(settlement.fromUserId, members, currentUserId)}
                <span className="mx-2 text-gray-400">→</span>
                {resolveMemberName(settlement.toUserId, members, currentUserId)}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(settlement.settledOn).toLocaleDateString('ja-JP')} に精算
              </p>
              {settlement.note && (
                <p className="text-xs text-gray-500">メモ: {settlement.note}</p>
              )}
            </div>
            <div className="text-right text-sm font-semibold text-blue-600">
              {currencyFormatter.format(settlement.amount)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
