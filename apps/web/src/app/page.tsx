/**
 * ホームページ
 * 
 * 世帯の有無に応じて UI を切り替えます。
 * - 世帯なし: セットアップカードを表示
 * - 世帯あり: ダッシュボードを表示
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CircleDollarSign,
  HandCoins,
  Handshake,
  ShoppingCart,
} from 'lucide-react';
import { HouseholdSetupCard } from '@/components/household/HouseholdSetupCard';
import { ShareJoinCodeModal } from '@/components/modals/ShareJoinCodeModal';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { SettlementModal } from '@/components/modals/SettlementModal';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { MonthlyCategoryBreakdown } from '@/components/dashboard/MonthlyCategoryBreakdown';
import { YearlySummaryCards } from '@/components/dashboard/YearlySummaryCards';
import { YearlyBalanceChart } from '@/components/dashboard/YearlyBalanceChart';
import { RecurringExpenseList } from '@/components/dashboard/RecurringExpenseList';
import { VariableExpenseReminderBanner } from '@/components/dashboard/VariableExpenseReminderBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomActionBar, type BottomAction } from '@/components/layout/BottomActionBar';
import { Button } from '@/components/ui/button';
import { HOUSEHOLD_SETTLEMENT_KEY } from '@/lib/validations/settlement';
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useSettlementStore } from '@/store/useSettlementStore';
import { useYearlyDashboardStore } from '@/store/useYearlyDashboardStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import type { Transaction, TransactionType, VariableExpenseReminder } from '@/types/transaction';

/**
 * 月をオフセットして YYYY-MM を生成
 */
function shiftMonth(base: string, offset: number): string {
  const [year, month] = base.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * ホームページコンポーネント
 */
export default function Home() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const household = useHouseholdStore((state) => state.household);
  const members = useHouseholdStore((state) => state.members);
  const loadHousehold = useHouseholdStore((state) => state.loadHousehold);
  const householdLoading = useHouseholdStore((state) => state.isLoading);

  const transactions = useTransactionStore((state) => state.transactions);
  const loadTransactions = useTransactionStore((state) => state.loadTransactions);
  const loadRecentTransactions = useTransactionStore((state) => state.loadRecentTransactions);
  const transactionsLoading = useTransactionStore((state) => state.isLoading);
  const transactionError = useTransactionStore((state) => state.error);
  const clearTransactionError = useTransactionStore((state) => state.clearError);

  const summary = useDashboardStore((state) => state.summary);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const setSelectedMonth = useDashboardStore((state) => state.setSelectedMonth);
  const loadMonthlySummary = useDashboardStore((state) => state.loadMonthlySummary);
  const summaryLoading = useDashboardStore((state) => state.isLoading);
  const dashboardError = useDashboardStore((state) => state.error);
  const clearDashboardError = useDashboardStore((state) => state.clearError);

  const yearlySummary = useYearlyDashboardStore((state) => state.summary);
  const yearlyDifferences = useYearlyDashboardStore((state) => state.monthlyDifferences);
  const selectedYear = useYearlyDashboardStore((state) => state.selectedYear);
  const setSelectedYear = useYearlyDashboardStore((state) => state.setSelectedYear);
  const loadYearlySummary = useYearlyDashboardStore((state) => state.loadYearlySummary);
  const yearlyLoading = useYearlyDashboardStore((state) => state.isLoading);
  const yearlyError = useYearlyDashboardStore((state) => state.error);
  const clearYearlyError = useYearlyDashboardStore((state) => state.clearError);

  const balances = useSettlementStore((state) => state.balances);
  const loadBalances = useSettlementStore((state) => state.loadBalances);
  const loadSettlements = useSettlementStore((state) => state.loadSettlements);
  const balancesLoading = useSettlementStore((state) => state.isLoading);
  const balanceHighlights = useSettlementStore((state) => state.balanceHighlights);
  const settlementError = useSettlementStore((state) => state.error);
  const clearSettlementError = useSettlementStore((state) => state.clearError);

  const recurringExpenses = useRecurringExpenseStore((state) => state.recurringExpenses);
  const variableReminders = useRecurringExpenseStore((state) => state.variableReminders);
  const loadRecurringExpenses = useRecurringExpenseStore((state) => state.loadRecurringExpenses);
  const recurringExpensesLoading = useRecurringExpenseStore((state) => state.isLoading);
  const recurringExpenseError = useRecurringExpenseStore((state) => state.error);
  const clearRecurringExpenseError = useRecurringExpenseStore((state) => state.clearError);
  const generateFixedTransactions = useRecurringExpenseStore((state) => state.generateFixedTransactions);
  const loadVariableReminders = useRecurringExpenseStore((state) => state.loadVariableReminders);
  const dismissReminder = useRecurringExpenseStore((state) => state.dismissReminder);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('expense');
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<{
    partnerId: string;
    direction: 'pay' | 'receive';
  } | null>(null);
  const [activeView, setActiveView] = useState<'monthly' | 'yearly' | 'recurring'>('monthly');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const selectedMonthRef = useRef(selectedMonth);

  useEffect(() => {
    selectedMonthRef.current = selectedMonth;
  }, [selectedMonth]);

  /**
   * 世帯情報を初期取得
   */
  useEffect(() => {
    if (user?.id) {
      loadHousehold(user.id);
    }
  }, [user?.id, loadHousehold]);

  /**
   * 世帯・月が変更されたときに取引とサマリーを読み込み
   */
  useEffect(() => {
    if (!household) {
      return;
    }

    const fetch = async () => {
      try {
        await loadTransactions(household.id, selectedMonth);
        await loadMonthlySummary(household.id, selectedMonth);
      } catch (error) {
        console.error('月次データ読み込みエラー:', error);
        toast.error('月次データの読み込みに失敗しました');
      }
    };

    void fetch();
  }, [household, selectedMonth, loadTransactions, loadMonthlySummary]);

  /**
   * 世帯確定後に最近の取引と残高を初期取得
   */
  useEffect(() => {
    if (!household) {
      return;
    }

    const fetch = async () => {
      try {
        // 固定費の自動生成（日付ベース）
        const generatedCount = await generateFixedTransactions(household.id);
        if (generatedCount > 0) {
          toast.success(`${generatedCount}件の固定費を自動登録しました`);
          try {
            await loadTransactions(household.id, selectedMonthRef.current);
            await loadMonthlySummary(household.id, selectedMonthRef.current);
          } catch (error) {
            console.error('月次データ再読み込みエラー:', error);
            toast.error('月次データの読み込みに失敗しました');
          }
        }

        // 変動費リマインダーの読み込み
        await loadVariableReminders(household.id);

        // その他の初期データ読み込み
        await Promise.all([
          loadRecentTransactions(household.id),
          loadBalances(household.id),
          loadSettlements(household.id),
          loadRecurringExpenses(household.id),
        ]);
      } catch (error) {
        console.error('初期データ読み込みエラー:', error);
      }
    };

    void fetch();
  }, [
    household,
    loadRecentTransactions,
    loadBalances,
    loadSettlements,
    loadRecurringExpenses,
    generateFixedTransactions,
    loadVariableReminders,
    loadTransactions,
    loadMonthlySummary,
  ]);

  /**
   * エラー通知をトースト表示
   */
  useEffect(() => {
    if (transactionError) {
      toast.error(transactionError);
      clearTransactionError();
    }
  }, [transactionError, clearTransactionError]);

  useEffect(() => {
    if (dashboardError) {
      toast.error(dashboardError);
      clearDashboardError();
    }
  }, [dashboardError, clearDashboardError]);

  useEffect(() => {
    if (yearlyError) {
      toast.error(yearlyError);
      clearYearlyError();
    }
  }, [yearlyError, clearYearlyError]);

  useEffect(() => {
    if (settlementError) {
      toast.error(settlementError);
      clearSettlementError();
    }
  }, [settlementError, clearSettlementError]);

  useEffect(() => {
    if (recurringExpenseError) {
      toast.error(recurringExpenseError);
      clearRecurringExpenseError();
    }
  }, [recurringExpenseError, clearRecurringExpenseError]);

  /**
   * ログアウト処理
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました');
      router.push('/auth');
      router.refresh();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      toast.error('ログアウトに失敗しました');
    }
  };

  /**
   * 月移動
   */
  const handlePrevMonth = () => setSelectedMonth(shiftMonth(selectedMonth, -1));
  const handleNextMonth = () => setSelectedMonth(shiftMonth(selectedMonth, 1));
  const handlePrevYear = () => setSelectedYear(selectedYear - 1);
  const handleNextYear = () => setSelectedYear(selectedYear + 1);

  /**
   * 取引モーダル表示
   */
  const openTransactionModal = (type: TransactionType) => {
    setTransactionModalType(type);
    setIsTransactionModalOpen(true);
  };

  /**
   * 取引登録・更新成功時の処理
   */
  const handleTransactionSuccess = async (transaction: Transaction) => {
    if (!household) {
      return;
    }

    await loadMonthlySummary(household.id, selectedMonth);

    if (activeView === 'yearly') {
      await loadYearlySummary(household.id, selectedYear);
    }

    if (transaction.type === 'advance') {
      await loadBalances(household.id);
    }
  };

  /**
   * リマインダーから支出登録
   */
  const handleRegisterFromReminder = (reminder: VariableExpenseReminder) => {
    setTransactionModalType('expense');
    // リマインダーの情報をセットして編集モードのように扱う（プリセット値として）
    setEditingTransaction({
      id: '',
      householdId: household?.id || '',
      type: 'expense',
      amount: reminder.amount,
      occurredOn: new Date().toISOString().split('T')[0],
      category: reminder.category,
      note: reminder.note,
      payerUserId: reminder.payerUserId,
      advanceToUserId: null,
      createdBy: user?.id || '',
      createdAt: '',
      updatedAt: '',
    });
    setIsTransactionModalOpen(true);
  };

  /**
   * 取引編集処理
   */
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  /**
   * 取引削除処理
   */
  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!household) {
      return;
    }

    if (!confirm(`この取引を削除してもよろしいですか？\n${transaction.note || getTypeLabel(transaction.type)}: ¥${transaction.amount.toLocaleString()}`)) {
      return;
    }

    try {
      const removeTransaction = useTransactionStore.getState().removeTransaction;
      await removeTransaction(transaction.id);

      toast.success('取引を削除しました');

      // データ再読み込み
      await Promise.all([
        loadTransactions(household.id, selectedMonth),
        loadRecentTransactions(household.id),
        loadMonthlySummary(household.id, selectedMonth),
      ]);

      if (transaction.type === 'advance') {
        await loadBalances(household.id);
      }

      if (activeView === 'yearly') {
        await loadYearlySummary(household.id, selectedYear);
      }
    } catch (error) {
      console.error('取引削除エラー:', error);
      toast.error('取引の削除に失敗しました');
    }
  };

  /**
   * 取引タイプの表示名
   */
  function getTypeLabel(type: Transaction['type']): string {
    switch (type) {
      case 'income':
        return '収入';
      case 'advance':
        return '立替';
      case 'expense':
      default:
        return '支出';
    }
  }

  const currentUserBalance =
    user?.id != null
      ? balances.find((balance) => balance.userId === user.id)?.balanceAmount ?? 0
      : 0;

  const openSettlementModal = (target: {
    partnerId: string;
    suggestedDirection: 'pay' | 'receive';
  }) => {
    setSettlementTarget({
      partnerId: target.partnerId,
      direction: target.suggestedDirection,
    });
    setIsSettlementModalOpen(true);
  };

  const handleSettlementModalOpenChange = (open: boolean) => {
    setIsSettlementModalOpen(open);
    if (!open) {
      setSettlementTarget(null);
    }
  };

  useEffect(() => {
    if (!household) {
      return;
    }

    if (activeView !== 'yearly') {
      return;
    }

    void loadYearlySummary(household.id, selectedYear).catch((error) => {
      console.error('年次データ読み込みエラー:', error);
    });
  }, [household, activeView, selectedYear, loadYearlySummary]);

  const handleViewChange = (value: string) => {
    const mode = value === 'yearly' ? 'yearly' : value === 'recurring' ? 'recurring' : 'monthly';
    setActiveView(mode);
  };

  const yearlyChartData = useMemo(() => yearlyDifferences, [yearlyDifferences]);

  /**
   * 下部アクションバーのアクション
   */
  const bottomActions: BottomAction[] = [
    {
      label: '支出',
      icon: ShoppingCart,
      onClick: () => openTransactionModal('expense'),
    },
    {
      label: '収入',
      icon: CircleDollarSign,
      onClick: () => openTransactionModal('income'),
    },
    {
      label: '立替',
      icon: Handshake,
      onClick: () => openTransactionModal('advance'),
    },
    {
      label: '精算',
      icon: HandCoins,
      onClick: () =>
        openSettlementModal({
          partnerId: HOUSEHOLD_SETTLEMENT_KEY,
          suggestedDirection: currentUserBalance < 0 ? 'pay' : 'receive',
        }),
    },
  ];

  /**
   * ローディング表示
   */
  if (householdLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">読み込み中...</div>
      </div>
    );
  }

  /**
   * 世帯未所属の画面
   */
  if (!household) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold">ふたりの財布</h1>
            <p className="mt-2 text-gray-600">夫婦のための家計管理アプリ</p>
          </div>

          <HouseholdSetupCard />

          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            ログアウト
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = household.ownerUserId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <DashboardHeader
        householdName={household.name}
        userEmail={user?.email ?? undefined}
        viewMode={activeView}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onPrevYear={handlePrevYear}
        onNextYear={handleNextYear}
        onShare={isOwner ? () => setIsShareModalOpen(true) : undefined}
        onSignOut={handleSignOut}
        isOwner={isOwner}
      />

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <Tabs value={activeView} onValueChange={handleViewChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="monthly">月次ビュー</TabsTrigger>
            <TabsTrigger value="yearly">年次ビュー</TabsTrigger>
            <TabsTrigger value="recurring">定期支出</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-6">
            {/* 変動費リマインダーバナー */}
            <VariableExpenseReminderBanner
              reminders={variableReminders}
              members={members}
              onRegister={handleRegisterFromReminder}
              onDismiss={dismissReminder}
            />

            <SummaryCards summary={summary} isLoading={summaryLoading || transactionsLoading} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <MonthlyCategoryBreakdown
                transactions={transactions}
                isLoading={transactionsLoading}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
              <BalanceCard
                balances={balances}
                currentUserId={user?.id}
                isLoading={balancesLoading}
                highlights={balanceHighlights}
                onSelectSettlementTarget={openSettlementModal}
              />
            </div>

            <RecentTransactions 
              transactions={transactions} 
              isLoading={transactionsLoading}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
            />
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            <YearlySummaryCards summary={yearlySummary} isLoading={yearlyLoading} />
            <YearlyBalanceChart data={yearlyChartData} isLoading={yearlyLoading} />
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            <RecurringExpenseList
              householdId={household.id}
              members={members}
              recurringExpenses={recurringExpenses}
              isLoading={recurringExpensesLoading}
            />
          </TabsContent>
        </Tabs>
      </main>

      <BottomActionBar actions={bottomActions} />

      <ShareJoinCodeModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      />

      <TransactionModal
        open={isTransactionModalOpen}
        onOpenChange={(open) => {
          setIsTransactionModalOpen(open);
          if (!open) {
            setEditingTransaction(undefined);
          }
        }}
        householdId={household.id}
        members={members}
        defaultType={transactionModalType}
        editingTransaction={editingTransaction}
        onSuccess={handleTransactionSuccess}
      />

      <SettlementModal
        open={isSettlementModalOpen}
        onOpenChange={handleSettlementModalOpenChange}
        householdId={household.id}
        members={members}
        initialPartnerId={settlementTarget?.partnerId}
        initialDirection={settlementTarget?.direction}
      />
    </div>
  );
}
