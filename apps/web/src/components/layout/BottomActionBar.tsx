/**
 * 画面下部固定のアクションバー
 * 支出/収入/立替/精算の入力を1タップで開始できる
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * アクションボタンの定義
 */
export interface BottomAction {
  /** 表示ラベル */
  label: string;
  /** 表示アイコン */
  icon: LucideIcon;
  /** クリック時の処理 */
  onClick: () => void;
  /** 無効状態 */
  disabled?: boolean;
}

/**
 * BottomActionBar のプロパティ
 */
interface BottomActionBarProps {
  /** 表示するアクション一覧 */
  actions: BottomAction[];
}

/**
 * 画面下部固定のアクションバー
 */
export function BottomActionBar({ actions }: BottomActionBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
      <div
        className="flex justify-around items-center h-16 px-2 max-w-5xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 text-gray-600 transition-colors',
              'hover:text-blue-600 active:text-blue-700',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-xs mt-1">{action.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
