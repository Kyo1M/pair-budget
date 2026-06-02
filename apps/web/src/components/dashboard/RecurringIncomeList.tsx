/**
 * 定期収入一覧コンポーネント
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Edit, Trash2, Briefcase, Calendar, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HouseholdMember } from '@/types/household';
import type { RecurringIncome } from '@/types/transaction';
import { TRANSACTION_CATEGORY_MAP } from '@/constants/categories';
import { RecurringIncomeModal } from '@/components/modals/RecurringIncomeModal';
import { useRecurringIncomeStore } from '@/store/useRecurringIncomeStore';

/**
 * 定期収入一覧のプロパティ
 */
interface RecurringIncomeListProps {
  /** 世帯ID */
  householdId: string;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 定期収入一覧 */
  recurringIncomes: RecurringIncome[];
  /** ローディング状態 */
  isLoading: boolean;
}

/**
 * 会員名の表示
 */
function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

/**
 * 定期収入一覧コンポーネント
 */
export function RecurringIncomeList({
  householdId,
  members,
  recurringIncomes,
  isLoading,
}: RecurringIncomeListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecurringIncome, setEditingRecurringIncome] = useState<RecurringIncome | undefined>();

  const removeRecurringIncome = useRecurringIncomeStore((state) => state.removeRecurringIncome);
  const loadRecurringIncomes = useRecurringIncomeStore((state) => state.loadRecurringIncomes);
  const loadIncomeReminders = useRecurringIncomeStore((state) => state.loadIncomeReminders);

  /**
   * 定期収入編集
   */
  const handleEdit = (recurringIncome: RecurringIncome) => {
    setEditingRecurringIncome(recurringIncome);
    setIsModalOpen(true);
  };

  /**
   * 定期収入削除
   */
  const handleDelete = async (recurringIncome: RecurringIncome) => {
    if (!confirm(`この定期収入を削除してもよろしいですか？\n${recurringIncome.note || '収入'}: ¥${recurringIncome.amount.toLocaleString()}`)) {
      return;
    }

    try {
      await removeRecurringIncome(recurringIncome.id);
      // 削除後はサーバの状態に合わせて収入リマインダーを再取得し、
      // ダッシュボードのバナーに削除済みの収入が残らないようにする。
      await loadIncomeReminders(householdId);
      toast.success('定期収入を削除しました');
    } catch (error) {
      console.error('定期収入削除エラー:', error);
      toast.error('定期収入の削除に失敗しました');
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingRecurringIncome(undefined);
    }
  };

  /**
   * 定期収入作成・更新成功時の処理
   *
   * 一覧と収入リマインダーをサーバから再取得し、画面表示を最新化する。
   */
  const handleSuccess = async () => {
    await Promise.all([
      loadRecurringIncomes(householdId),
      loadIncomeReminders(householdId),
    ]);
  };

  /**
   * ローディング表示
   */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-600">読み込み中...</div>
      </div>
    );
  }

  /**
   * 空の状態表示
   */
  if (recurringIncomes.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              定期収入がありません
            </h3>
            <p className="text-gray-600 text-center mb-6">
              毎月の給料などの定期収入を設定しましょう。<br />
              受取日にリマインダーが表示されます。
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              定期収入を追加
            </Button>
          </CardContent>
        </Card>

        <RecurringIncomeModal
          open={isModalOpen}
          onOpenChange={handleModalClose}
          householdId={householdId}
          members={members}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 定期収入一覧 */}
      <div className="grid gap-4">
        {recurringIncomes.map((recurringIncome) => {
          const recipientMember = members.find(m => m.userId === recurringIncome.recipientUserId);
          const recipientName = recipientMember ? getMemberLabel(recipientMember) : '不明';
          const category = TRANSACTION_CATEGORY_MAP[recurringIncome.category];
          const CategoryIcon = category?.icon || Briefcase;

          return (
            <Card key={recurringIncome.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="h-5 w-5 text-emerald-500" />
                    <div>
                      <CardTitle className="text-lg">
                        ¥{recurringIncome.amount.toLocaleString()}
                      </CardTitle>
                      <CardDescription>
                        {recurringIncome.note || category?.label || '定期収入'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="default"
                      className="text-xs bg-emerald-100 text-emerald-800"
                    >
                      {category?.label}
                    </Badge>
                    {!recurringIncome.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        無効
                      </Badge>
                    )}
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(recurringIncome)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(recurringIncome)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{recurringIncome.dayOfMonth}日</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{recipientName}</span>
                  </div>
                </div>
                {!recurringIncome.isActive ? (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>無効化されているため、リマインダーが停止されています</span>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-500">
                    毎月{recurringIncome.dayOfMonth}日以降にリマインダーが表示されます
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 定期収入追加ボタン */}
      <div className="flex justify-center pt-4">
        <Button onClick={() => setIsModalOpen(true)}>
          定期収入を追加
        </Button>
      </div>

      {/* 定期収入モーダル */}
      <RecurringIncomeModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        householdId={householdId}
        members={members}
        editingRecurringIncome={editingRecurringIncome}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
