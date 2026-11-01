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
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Camera,
  CircleDollarSign,
  Handshake,
  ShoppingCart,
} from 'lucide-react';
import { HouseholdSetupCard } from '@/components/household/HouseholdSetupCard';
import { ShareJoinCodeModal } from '@/components/modals/ShareJoinCodeModal';
import {
  TransactionModal,
  type TransactionModalSource,
  type TransactionSuccessContext,
} from '@/components/modals/TransactionModal';
import { ReceiptCaptureModal } from '@/components/modals/ReceiptCaptureModal';
import { SettlementModal } from '@/components/modals/SettlementModal';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { MonthlyDashboardView } from '@/components/dashboard/MonthlyDashboardView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomActionBar, type BottomAction } from '@/components/layout/BottomActionBar';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/LoadError';
import { formatLocalDate } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useSettlementStore } from '@/store/useSettlementStore';
import { useYearlyDashboardStore } from '@/store/useYearlyDashboardStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import { useRecurringIncomeStore } from '@/store/useRecurringIncomeStore';
import type { Transaction, TransactionType, VariableExpenseReminder, IncomeReminder } from '@/types/transaction';

const YearlyDashboardView = dynamic(() =>
  import('@/components/dashboard/YearlyDashboardView').then((module) => module.YearlyDashboardView)
);
const RecurringDashboardView = dynamic(() =>
  import('@/components/dashboard/RecurringDashboardView').then((module) => module.RecurringDashboardView)
);
const RecurringIncomeDashboardView = dynamic(() =>
  import('@/components/dashboard/RecurringIncomeDashboardView').then(
    (module) => module.RecurringIncomeDashboardView
  )
);

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
  const { user, signOut, isLoading: authLoading, error: authError, checkSession } = useAuthStore();

  const household = useHouseholdStore((state) => state.household);
  const members = useHouseholdStore((state) => state.members);
  const loadHousehold = useHouseholdStore((state) => state.loadHousehold);
  const householdLoading = useHouseholdStore((state) => state.isLoading);
  const householdError = useHouseholdStore((state) => state.loadError);
  const loadedUserId = useHouseholdStore((state) => state.loadedUserId);
  const householdReady = !!user && loadedUserId === user.id && !householdError && !householdLoading;

  const transactions = useTransactionStore((state) => state.transactions);
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
  const monthlyLoadedKey = useDashboardStore((state) => state.loadedKey);

  const yearlySummary = useYearlyDashboardStore((state) => state.summary);
  const yearlyDifferences = useYearlyDashboardStore((state) => state.monthlyDifferences);
  const selectedYear = useYearlyDashboardStore((state) => state.selectedYear);
  const setSelectedYear = useYearlyDashboardStore((state) => state.setSelectedYear);
  const loadYearlySummary = useYearlyDashboardStore((state) => state.loadYearlySummary);
  const yearlyLoading = useYearlyDashboardStore((state) => state.isLoading);
  const yearlyError = useYearlyDashboardStore((state) => state.error);
  const yearlyLoadedKey = useYearlyDashboardStore((state) => state.loadedKey);

  const balances = useSettlementStore((state) => state.balances);
  const loadBalances = useSettlementStore((state) => state.loadBalances);
  const loadSettlements = useSettlementStore((state) => state.loadSettlements);
  const balancesLoading = useSettlementStore((state) => state.isLoading);
  const balanceLoadError = useSettlementStore((state) => state.balanceLoadError);
  const balanceLoadedHouseholdId = useSettlementStore((state) => state.loadedHouseholdId);
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
  const completeReminder = useRecurringExpenseStore((state) => state.completeReminder);

  const recurringIncomes = useRecurringIncomeStore((state) => state.recurringIncomes);
  const incomeReminders = useRecurringIncomeStore((state) => state.incomeReminders);
  const loadRecurringIncomes = useRecurringIncomeStore((state) => state.loadRecurringIncomes);
  const recurringIncomesLoading = useRecurringIncomeStore((state) => state.isLoading);
  const recurringIncomeError = useRecurringIncomeStore((state) => state.error);
  const clearRecurringIncomeError = useRecurringIncomeStore((state) => state.clearError);
  const loadIncomeReminders = useRecurringIncomeStore((state) => state.loadIncomeReminders);
  const dismissIncomeReminder = useRecurringIncomeStore((state) => state.dismissIncomeReminder);
  const completeIncomeReminder = useRecurringIncomeStore((state) => state.completeIncomeReminder);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalSource, setTransactionModalSource] = useState<TransactionModalSource>({
    kind: 'create',
    type: 'expense',
  });
  const [isReceiptCaptureOpen, setIsReceiptCaptureOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<{
    subjectUserId: string;
    counterpartyUserId: string | null;
  } | null>(null);
  const [activeView, setActiveView] = useState<'monthly' | 'yearly' | 'recurring' | 'recurring-income'>('monthly');
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
    if (!household || !householdReady) {
      return;
    }

    const fetch = async () => {
      try {
        await loadMonthlySummary(household.id, selectedMonth);
      } catch (error) {
        console.error('月次データ読み込みエラー:', error);
      }
    };

    void fetch();
  }, [household, householdReady, selectedMonth, loadMonthlySummary]);

  /**
   * 世帯確定後に最近の取引と残高を初期取得
   */
  useEffect(() => {
    if (!household || !householdReady) {
      return;
    }

    // 一つの読み込みに失敗しても、残高や他の一覧の取得は続ける。
    void Promise.allSettled([
      loadRecentTransactions(household.id),
      loadBalances(household.id),
      loadSettlements(household.id),
      loadRecurringExpenses(household.id),
      loadRecurringIncomes(household.id),
      loadVariableReminders(household.id),
      loadIncomeReminders(household.id),
    ]);

    void generateFixedTransactions(household.id).then(async (generatedCount) => {
      if (generatedCount > 0) {
        toast.success(`${generatedCount}件の固定費を自動登録しました`);
        await loadMonthlySummary(household.id, selectedMonthRef.current);
      }
    }).catch((error) => {
      console.error('固定費の初期読み込みエラー:', error);
    });
  }, [
    household,
    householdReady,
    loadRecentTransactions,
    loadBalances,
    loadSettlements,
    loadRecurringExpenses,
    loadRecurringIncomes,
    generateFixedTransactions,
    loadVariableReminders,
    loadIncomeReminders,
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

  useEffect(() => {
    if (recurringIncomeError) {
      toast.error(recurringIncomeError);
      clearRecurringIncomeError();
    }
  }, [recurringIncomeError, clearRecurringIncomeError]);

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
    setTransactionModalSource({ kind: 'create', type });
    setIsTransactionModalOpen(true);
  };

  /**
   * 取引登録・更新成功時の処理
   */
  const handleTransactionSuccess = async (
    transaction: Transaction,
    context?: TransactionSuccessContext
  ) => {
    if (!household) {
      return;
    }

    // 登録自体は成功済み。再取得の失敗で登録失敗と表示しない。
    const refreshes: Promise<unknown>[] = [loadMonthlySummary(household.id, selectedMonth)];
    if (activeView === 'yearly') {
      refreshes.push(loadYearlySummary(household.id, selectedYear));
    }
    if (transaction.type === 'advance') {
      refreshes.push(loadBalances(household.id));
    }
    if (context?.source.kind === 'reminder') {
      if (context.source.reminderKind === 'expense') {
        completeReminder(context.source.reminderId);
        refreshes.push(loadVariableReminders(household.id));
      } else {
        completeIncomeReminder(context.source.reminderId);
        refreshes.push(loadIncomeReminders(household.id));
      }
    }
    await Promise.allSettled(refreshes);
  };

  /**
   * リマインダーから支出登録
   */
  const handleRegisterFromReminder = (reminder: VariableExpenseReminder) => {
    setTransactionModalSource({
      kind: 'reminder',
      reminderKind: 'expense',
      reminderId: reminder.id,
      preset: {
        type: 'expense',
        amount: reminder.amount,
        occurredOn: formatLocalDate(),
        category: reminder.category,
        note: reminder.note,
        payerUserId: reminder.payerUserId,
        advanceToUserId: null,
        place: null,
      },
    });
    setIsTransactionModalOpen(true);
  };

  /**
   * 収入リマインダーから収入登録
   */
  const handleRegisterFromIncomeReminder = (reminder: IncomeReminder) => {
    setTransactionModalSource({
      kind: 'reminder',
      reminderKind: 'income',
      reminderId: reminder.id,
      preset: {
        type: 'income',
        amount: reminder.amount,
        occurredOn: formatLocalDate(),
        category: reminder.category,
        note: reminder.note,
        payerUserId: reminder.recipientUserId,
        advanceToUserId: null,
        place: null,
      },
    });
    setIsTransactionModalOpen(true);
  };

  /**
   * 取引編集処理
   */
  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionModalSource({ kind: 'edit', transaction });
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
        loadRecentTransactions(household.id),
        loadMonthlySummary(household.id, selectedMonth),
      ]);

      if (transaction.type === 'advance') {
        await loadBalances(household.id);
      }

      await Promise.all([
        loadVariableReminders(household.id),
        loadIncomeReminders(household.id),
      ]);

      if (activeView === 'yearly') {
        await loadYearlySummary(household.id, selectedYear);
      }
    } catch (error) {
      console.error('取引削除エラー:', error);
      // 各ストアの error をページ側の共通通知で一度だけ表示する。
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

  const openSettlementModal = (target?: {
    subjectUserId: string;
    counterpartyUserId: string | null;
  }) => {
    setSettlementTarget(target ?? null);
    setIsSettlementModalOpen(true);
  };

  const handleSettlementModalOpenChange = (open: boolean) => {
    setIsSettlementModalOpen(open);
    if (!open) {
      setSettlementTarget(null);
    }
  };

  useEffect(() => {
    if (!household || !householdReady) {
      return;
    }

    if (activeView !== 'yearly') {
      return;
    }

    void loadYearlySummary(household.id, selectedYear).catch((error) => {
      console.error('年次データ読み込みエラー:', error);
    });
  }, [household, householdReady, activeView, selectedYear, loadYearlySummary]);

  const handleViewChange = (value: string) => {
    if (value === 'yearly') {
      setActiveView('yearly');
    } else if (value === 'recurring') {
      setActiveView('recurring');
    } else if (value === 'recurring-income') {
      setActiveView('recurring-income');
    } else {
      setActiveView('monthly');
    }
  };

  const yearlyChartData = useMemo(() => yearlyDifferences, [yearlyDifferences]);

  /**
   * 下部アクションバーのアクション
   */
  const bottomActions: BottomAction[] = [
    {
      label: 'カメラ',
      icon: Camera,
      onClick: () => setIsReceiptCaptureOpen(true),
    },
    {
      label: '支出',
      icon: ShoppingCart,
      onClick: () => openTransactionModal('expense'),
    },
    {
      label: '立替',
      icon: Handshake,
      onClick: () => openTransactionModal('advance'),
    },
    {
      label: '収入',
      icon: CircleDollarSign,
      onClick: () => openTransactionModal('income'),
    },
  ];

  if (authLoading) {
    return <p role="status" className="p-8 text-center">ログイン状態を確認中...</p>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg p-8">
        {authError ? (
          <LoadError title="ログイン状態を確認できませんでした" onRetry={() => void checkSession()} />
        ) : (
          <p>ログインが必要です。<a className="text-blue-600 underline" href="/auth">ログインへ</a></p>
        )}
      </main>
    );
  }

  if (householdError) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <LoadError title="世帯情報を取得できませんでした" onRetry={() => void loadHousehold(user.id)} />
      </main>
    );
  }

  if (!householdReady) {
    return <p role="status" className="p-8 text-center">世帯情報を読み込み中...</p>;
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
          <TabsList className="grid w-full grid-cols-4 md:w-auto">
            <TabsTrigger value="monthly">月次ビュー</TabsTrigger>
            <TabsTrigger value="yearly">年次ビュー</TabsTrigger>
            <TabsTrigger value="recurring">定期支出</TabsTrigger>
            <TabsTrigger value="recurring-income">定期収入</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-6">
            <MonthlyDashboardView
              variableReminders={variableReminders}
              incomeReminders={incomeReminders}
              members={members}
              onRegisterReminder={handleRegisterFromReminder}
              onDismissReminder={dismissReminder}
              onRegisterIncomeReminder={handleRegisterFromIncomeReminder}
              onDismissIncomeReminder={dismissIncomeReminder}
              summary={summary}
              summaryLoading={summaryLoading || monthlyLoadedKey !== `${household.id}:${selectedMonth}`}
              monthlyError={dashboardError}
              onRetryMonthly={() => void loadMonthlySummary(household.id, selectedMonth).catch(() => {})}
              transactions={transactions}
              transactionsLoading={transactionsLoading || summaryLoading || monthlyLoadedKey !== `${household.id}:${selectedMonth}`}
              balances={balances}
              balanceHighlights={balanceHighlights}
              balancesLoading={balancesLoading || balanceLoadedHouseholdId !== household.id}
              balanceError={balanceLoadError}
              onRetryBalances={() => void loadBalances(household.id).catch(() => {})}
              currentUserId={user?.id}
              onSelectSettlementTarget={openSettlementModal}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            {yearlyError ? (
              <LoadError title="年次集計を取得できませんでした" onRetry={() => void loadYearlySummary(household.id, selectedYear).catch(() => {})} />
            ) : (
              <YearlyDashboardView
                summary={yearlySummary}
                chartData={yearlyChartData}
                isLoading={yearlyLoading || yearlyLoadedKey !== `${household.id}:${selectedYear}`}
              />
            )}
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            <RecurringDashboardView
              householdId={household.id}
              members={members}
              recurringExpenses={recurringExpenses}
              isLoading={recurringExpensesLoading}
            />
          </TabsContent>

          <TabsContent value="recurring-income" className="space-y-6">
            <RecurringIncomeDashboardView
              householdId={household.id}
              members={members}
              recurringIncomes={recurringIncomes}
              isLoading={recurringIncomesLoading}
            />
          </TabsContent>
        </Tabs>
      </main>

      <BottomActionBar actions={bottomActions} />

      <ShareJoinCodeModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      />

      {user?.id && (
        <ReceiptCaptureModal
          open={isReceiptCaptureOpen}
          onOpenChange={setIsReceiptCaptureOpen}
          householdId={household.id}
          currentUserId={user.id}
          members={members}
          onSuccess={handleTransactionSuccess}
        />
      )}

      <TransactionModal
        open={isTransactionModalOpen}
        onOpenChange={(open) => {
          setIsTransactionModalOpen(open);
        }}
        householdId={household.id}
        members={members}
        source={transactionModalSource}
        onSuccess={handleTransactionSuccess}
      />

      <SettlementModal
        open={isSettlementModalOpen}
        onOpenChange={handleSettlementModalOpenChange}
        householdId={household.id}
        initialSubjectUserId={settlementTarget?.subjectUserId}
        initialCounterpartyUserId={settlementTarget?.counterpartyUserId}
      />
    </div>
  );
}
