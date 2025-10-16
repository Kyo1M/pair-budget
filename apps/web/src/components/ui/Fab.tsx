/**
 * フローティングアクションボタン (FAB)
 */

'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * FAB の各アクション
 */
export interface FabAction {
  /** 表示ラベル */
  label: string;
  /** 表示アイコン */
  icon: LucideIcon;
  /** クリック時の処理 */
  onClick: () => void;
  /** 無効状態 */
  disabled?: boolean;
  /** ボタンのカラーバリエーション */
  variant?: 'default' | 'destructive';
}

/**
 * FAB コンポーネントのプロパティ
 */
interface FabProps {
  /** 表示するアクション一覧 */
  actions: FabAction[];
}

/**
 * フローティングアクションボタン
 */
export function Fab({ actions }: FabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);

  const handleAction = (action: FabAction) => {
    if (action.disabled) {
      return;
    }
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              className={cn(
                'flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-lg ring-1 ring-black/5 transition hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60',
                action.variant === 'destructive' ? 'text-rose-600' : 'text-gray-700'
              )}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-xl transition hover:scale-105"
        onClick={toggle}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
