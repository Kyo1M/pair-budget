/**
 * 変動費リマインダーバナーコンポーネント
 *
 * 変動費の入力日が来たことを通知するバナー
 */

'use client';

import { Bell, X, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { VariableExpenseReminder } from '@/types/transaction';
import type { HouseholdMember } from '@/types/household';
import { TRANSACTION_CATEGORY_MAP } from '@/constants/categories';

/**
 * プロパティ
 */
interface VariableExpenseReminderBannerProps {
  /** リマインダー一覧 */
  reminders: VariableExpenseReminder[];
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 登録ボタンクリック時のコールバック */
  onRegister: (reminder: VariableExpenseReminder) => void;
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
 * 変動費リマインダーバナーコンポーネント
 */
export function VariableExpenseReminderBanner({
  reminders,
  members,
  onRegister,
  onDismiss,
}: VariableExpenseReminderBannerProps) {
  if (reminders.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="py-4">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-amber-900">
                変動費の入力リマインダー
              </h3>
              <p className="text-sm text-amber-700">
                以下の変動費の入力日です。金額を確認して登録してください。
              </p>
            </div>

            <div className="space-y-2">
              {reminders.map((reminder) => {
                const category = TRANSACTION_CATEGORY_MAP[reminder.category];
                const payer = members.find(m => m.userId === reminder.payerUserId);
                const payerName = payer ? getMemberLabel(payer) : '不明';

                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {reminder.note || category?.label || '変動費'}
                      </div>
                      <div className="text-sm text-gray-500">
                        目安: ¥{reminder.amount.toLocaleString()} / 毎月{reminder.dayOfMonth}日 / {payerName}
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
