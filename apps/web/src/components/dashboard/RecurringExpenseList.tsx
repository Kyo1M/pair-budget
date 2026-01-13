/**
 * 定期支出一覧コンポーネント
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Edit, Trash2, Receipt, Calendar, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HouseholdMember } from '@/types/household';
import type { RecurringExpense } from '@/types/transaction';
import { TRANSACTION_CATEGORY_MAP } from '@/constants/categories';
import { RecurringExpenseModal } from '@/components/modals/RecurringExpenseModal';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';

/**
 * 定期支出一覧のプロパティ
 */
interface RecurringExpenseListProps {
  /** 世帯ID */
  householdId: string;
  /** 世帯メンバー一覧 */
  members: HouseholdMember[];
  /** 定期支出一覧 */
  recurringExpenses: RecurringExpense[];
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
 * 定期支出一覧コンポーネント
 */
export function RecurringExpenseList({
  householdId,
  members,
  recurringExpenses,
  isLoading,
}: RecurringExpenseListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<RecurringExpense | undefined>();
  
  const removeRecurringExpense = useRecurringExpenseStore((state) => state.removeRecurringExpense);

  /**
   * 定期支出編集
   */
  const handleEdit = (recurringExpense: RecurringExpense) => {
    setEditingRecurringExpense(recurringExpense);
    setIsModalOpen(true);
  };

  /**
   * 定期支出削除
   */
  const handleDelete = async (recurringExpense: RecurringExpense) => {
    if (!confirm(`この定期支出を削除してもよろしいですか？\n${recurringExpense.note || '固定費'}: ¥${recurringExpense.amount.toLocaleString()}`)) {
      return;
    }

    try {
      await removeRecurringExpense(recurringExpense.id);
      toast.success('定期支出を削除しました');
    } catch (error) {
      console.error('定期支出削除エラー:', error);
      toast.error('定期支出の削除に失敗しました');
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingRecurringExpense(undefined);
    }
  };

  /**
   * 定期支出作成成功時の処理
   */
  const handleSuccess = async () => {
    // 必要に応じて追加の処理を実装
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
  if (recurringExpenses.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              定期支出がありません
            </h3>
            <p className="text-gray-600 text-center mb-6">
              毎月自動で登録される固定費を設定しましょう。<br />
              家賃、光熱費、通信費などを登録できます。
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              定期支出を追加
            </Button>
          </CardContent>
        </Card>

        <RecurringExpenseModal
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
      {/* 定期支出一覧 */}
      <div className="grid gap-4">
        {recurringExpenses.map((recurringExpense) => {
          const payerMember = members.find(m => m.userId === recurringExpense.payerUserId);
          const payerName = payerMember ? getMemberLabel(payerMember) : '不明';
          const category = TRANSACTION_CATEGORY_MAP[recurringExpense.category];
          const CategoryIcon = category?.icon || Receipt;

          return (
            <Card key={recurringExpense.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="h-5 w-5 text-violet-500" />
                    <div>
                      <CardTitle className="text-lg">
                        ¥{recurringExpense.amount.toLocaleString()}
                      </CardTitle>
                      <CardDescription>
                        {recurringExpense.note || category?.label || '定期支出'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={recurringExpense.expenseType === 'fixed' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {recurringExpense.expenseType === 'fixed' ? '固定費' : '変動費'}
                    </Badge>
                    {!recurringExpense.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        無効
                      </Badge>
                    )}
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(recurringExpense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(recurringExpense)}
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
                    <span>{recurringExpense.dayOfMonth}日</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{payerName}</span>
                  </div>
                </div>
                {!recurringExpense.isActive ? (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>無効化されているため、自動生成・通知が停止されています</span>
                  </div>
                ) : recurringExpense.expenseType === 'variable' && (
                  <div className="mt-3 text-sm text-gray-500">
                    毎月{recurringExpense.dayOfMonth}日にリマインダーが表示されます
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 定期支出追加ボタン */}
      <div className="flex justify-center pt-4">
        <Button onClick={() => setIsModalOpen(true)}>
          定期支出を追加
        </Button>
      </div>

      {/* 定期支出モーダル */}
      <RecurringExpenseModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        householdId={householdId}
        members={members}
        editingRecurringExpense={editingRecurringExpense}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
