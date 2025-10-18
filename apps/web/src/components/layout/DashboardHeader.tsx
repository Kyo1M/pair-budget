/**
 * ダッシュボードヘッダー
 * 
 * 世帯名と月選択、アクションボタンを表示します。
 */

'use client';

import { ChevronLeft, ChevronRight, LogOut, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ヘッダーのプロパティ
 */
interface DashboardHeaderProps {
  /** 世帯名 */
  householdName: string;
  /** ユーザーのメールアドレス */
  userEmail?: string;
  /** 表示モード */
  viewMode: 'monthly' | 'yearly';
  /** 選択中の月 (YYYY-MM) */
  selectedMonth?: string;
  /** 選択中の年 */
  selectedYear?: number;
  /** 前月へ移動 */
  onPrevMonth?: () => void;
  /** 次月へ移動 */
  onNextMonth?: () => void;
  /** 前年へ移動 */
  onPrevYear?: () => void;
  /** 次年へ移動 */
  onNextYear?: () => void;
  /** 参加コード共有アクション */
  onShare?: () => void;
  /** ログアウトアクション */
  onSignOut: () => void;
  /** 現在のユーザーが世帯オーナーかどうか */
  isOwner: boolean;
}

/**
 * 月表示用フォーマット
 * 
 * @param month - YYYY-MM
 * @returns YYYY年M月
 */
function formatMonthLabel(month: string): string {
  const [year, monthValue] = month.split('-');
  return `${year}年${Number(monthValue)}月`;
}

/**
 * ダッシュボードヘッダーコンポーネント
 */
export function DashboardHeader({
  householdName,
  userEmail,
  viewMode,
  selectedMonth,
  selectedYear,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  onShare,
  onSignOut,
  isOwner,
}: DashboardHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{householdName}</h1>
          {userEmail && (
            <p className="text-sm text-gray-600">{userEmail}</p>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {viewMode === 'monthly' ? (
            <div className="flex items-center justify-center gap-2 rounded-full border px-3 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPrevMonth}
                aria-label="前の月へ"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center text-sm font-semibold">
                {selectedMonth ? formatMonthLabel(selectedMonth) : '----'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNextMonth}
                aria-label="次の月へ"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-full border px-3 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPrevYear}
                aria-label="前年へ"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center text-sm font-semibold">
                {selectedYear ? `${selectedYear}年` : '----'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNextYear}
                aria-label="翌年へ"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {isOwner && onShare && (
              <Button
                onClick={onShare}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                参加コードを共有
              </Button>
            )}
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
