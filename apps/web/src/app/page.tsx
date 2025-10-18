/**
 * ホームページ
 * 
 * 世帯の有無に応じて UI を切り替えます。
 * - 世帯なし: セットアップカードを表示
 * - 世帯あり: ダッシュボードを表示
 */

'use client';

import { useEffect, useState } from 'react';
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
import { Fab, type FabAction } from '@/components/ui/Fab';
import { Button } from '@/components/ui/button';
import { HOUSEHOLD_SETTLEMENT_KEY } from '@/lib/validations/settlement';
import { useAuthStore } from '@/store/useAuthStore';
import { useHouseholdStore } from '@/store/useHouseholdStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useSettlementStore } from '@/store/useSettlementStore';
import type { Transaction, TransactionType } from '@/types/transaction';

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
  const recentTransactions = useTransactionStore((state) => state.recentTransactions);
  const loadTransactions = useTransactionStore((state) => state.loadTransactions);
  const loadRecentTransactions = useTransactionStore((state) => state.loadRecentTransactions);
  const transactionsLoading = useTransactionStore((state) => state.isLoading);
  const recentLoading = useTransactionStore((state) => state.isRecentLoading);
  const transactionError = useTransactionStore((state) => state.error);
  const clearTransactionError = useTransactionStore((state) => state.clearError);

  const summary = useDashboardStore((state) => state.summary);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const setSelectedMonth = useDashboardStore((state) => state.setSelectedMonth);
  const loadMonthlySummary = useDashboardStore((state) => state.loadMonthlySummary);
  const summaryLoading = useDashboardStore((state) => state.isLoading);
  const dashboardError = useDashboardStore((state) => state.error);
  const clearDashboardError = useDashboardStore((state) => state.clearError);

  const balances = useSettlementStore((state) => state.balances);
  const loadBalances = useSettlementStore((state) => state.loadBalances);
  const loadSettlements = useSettlementStore((state) => state.loadSettlements);
  const balancesLoading = useSettlementStore((state) => state.isLoading);
  const balanceHighlights = useSettlementStore((state) => state.balanceHighlights);
  const settlementError = useSettlementStore((state) => state.error);
  const clearSettlementError = useSettlementStore((state) => state.clearError);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('expense');
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<{
    partnerId: string;
    direction: 'pay' | 'receive';
  } | null>(null);

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
        await Promise.all([
          loadRecentTransactions(household.id),
          loadBalances(household.id),
          loadSettlements(household.id),
        ]);
      } catch (error) {
        console.error('初期データ読み込みエラー:', error);
      }
    };

    void fetch();
  }, [household, loadRecentTransactions, loadBalances, loadSettlements]);

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
    if (settlementError) {
      toast.error(settlementError);
      clearSettlementError();
    }
  }, [settlementError, clearSettlementError]);

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

  /**
   * 取引モーダル表示
   */
  const openTransactionModal = (type: TransactionType) => {
    setTransactionModalType(type);
    setIsTransactionModalOpen(true);
  };

  /**
   * 取引登録成功時の処理
   */
  const handleTransactionSuccess = async (transaction: Transaction) => {
    if (!household) {
      return;
    }

    await loadMonthlySummary(household.id, selectedMonth);

    if (transaction.type === 'advance') {
      await loadBalances(household.id);
    }
  };

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

  /**
   * FAB のアクション
   */
  const fabActions: FabAction[] = [
    {
      label: '支出を記録',
      icon: ShoppingCart,
      onClick: () => openTransactionModal('expense'),
    },
    {
      label: '収入を記録',
      icon: CircleDollarSign,
      onClick: () => openTransactionModal('income'),
    },
    {
      label: '立替を記録',
      icon: Handshake,
      onClick: () => openTransactionModal('advance'),
    },
    {
      label: '精算を記録',
      icon: HandCoins,
      onClick: () =>
        openSettlementModal({
          partnerId: HOUSEHOLD_SETTLEMENT_KEY,
          suggestedDirection: currentUserBalance < 0 ? 'pay' : 'receive',
        }),
    },
  ] as const;

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
        selectedMonth={selectedMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onShare={isOwner ? () => setIsShareModalOpen(true) : undefined}
        onSignOut={handleSignOut}
        isOwner={isOwner}
      />

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <SummaryCards summary={summary} isLoading={summaryLoading || transactionsLoading} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <MonthlyCategoryBreakdown
            transactions={transactions}
            isLoading={transactionsLoading}
          />
          <BalanceCard
            balances={balances}
            currentUserId={user?.id}
            isLoading={balancesLoading}
            highlights={balanceHighlights}
            onSelectSettlementTarget={openSettlementModal}
          />
        </div>

        <RecentTransactions transactions={recentTransactions} isLoading={recentLoading} />
      </main>

      <Fab actions={fabActions} />

      <ShareJoinCodeModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      />

      <TransactionModal
        open={isTransactionModalOpen}
        onOpenChange={setIsTransactionModalOpen}
        householdId={household.id}
        members={members}
        defaultType={transactionModalType}
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
