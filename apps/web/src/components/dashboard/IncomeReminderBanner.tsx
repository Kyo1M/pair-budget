/**
 * 収入リマインダーバナーコンポーネント
 *
 * 定期収入の入力日が来たことを通知するバナー
 */

'use client';

import { Bell, X, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { IncomeReminder } from '@/types/transaction';
import type { HouseholdMember } from '@/types/household';
import { TRANSACTION_CATEGORY_MAP } from '@/constants/categories';

/**
 * プロパティ
 */
interface IncomeReminderBannerProps {
  /** リマインダー一覧 */
  reminders: IncomeReminder[];
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 登録ボタンクリック時のコールバック */
  onRegister: (reminder: IncomeReminder) => void;
  /** 閉じるボタンクリック時のコールバック */
  onDismiss: (id: string) => void;
}

/**
 * 会員名の表示
 */
function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

/**
 * 収入リマインダーバナーコンポーネント
 */
export function IncomeReminderBanner({
  reminders,
  members,
  onRegister,
  onDismiss,
}: IncomeReminderBannerProps) {
  if (reminders.length === 0) {
    return null;
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50">
      <CardContent className="py-4">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-emerald-900">
                収入の入力リマインダー
              </h3>
              <p className="text-sm text-emerald-700">
                以下の収入の入力日です。金額を確認して登録してください。
              </p>
            </div>

            <div className="space-y-2">
              {reminders.map((reminder) => {
                const category = TRANSACTION_CATEGORY_MAP[reminder.category];
                const recipient = members.find(m => m.userId === reminder.recipientUserId);
                const recipientName = recipient ? getMemberLabel(recipient) : '不明';

                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {reminder.note || category?.label || '収入'}
                      </div>
                      <div className="text-sm text-gray-500">
                        目安: ¥{reminder.amount.toLocaleString()} / 毎月{reminder.dayOfMonth}日 / {recipientName}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <Button
                        size="sm"
                        onClick={() => onRegister(reminder)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        登録
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDismiss(reminder.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
