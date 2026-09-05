"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnalyticsDashboardView } from "@/components/dashboard/AnalyticsDashboardView";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useHouseholdStore } from "@/store/useHouseholdStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useSettlementStore } from "@/store/useSettlementStore";
import { getTransactionsByDateRange } from "@/services/transactions";
import {
  buildDashboardAnalysis,
  getAnalyticsPeriod,
  isValidMonth,
  shiftAnalyticsMonth,
  type PaceMode,
} from "@/lib/analytics";
import { formatLocalDate } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

interface LoadedTransactions {
  key: string;
  transactions: Transaction[] | null;
  error: string | null;
  loading: boolean;
}

export function DashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const household = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const householdError = useHouseholdStore((s) => s.error);
  const loadHousehold = useHouseholdStore((s) => s.loadHousehold);
  const overviewMonth = useDashboardStore((s) => s.selectedMonth);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [householdRetry, setHouseholdRetry] = useState(0);
  const [today, setToday] = useState(formatLocalDate);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<LoadedTransactions | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [paceMode, setPaceMode] = useState<PaceMode>("daily");
  const editingSource = useMemo(
    () => (editing ? { kind: "edit" as const, transaction: editing } : null),
    [editing],
  );
  const monthParam = params.get("month");
  const month = isValidMonth(monthParam) ? monthParam : overviewMonth;
  const requestKey = `${user?.id}:${household?.id}:${month}:${today}`;

  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadHousehold(user.id).then(() => {
      if (active) setLoadedUserId(user.id);
    });
    return () => {
      active = false;
    };
  }, [user, loadHousehold, householdRetry]);

  useEffect(() => {
    const updateDay = () => setToday(formatLocalDate());
    window.addEventListener("focus", updateDay);
    const interval = window.setInterval(updateDay, 60_000);
    return () => {
      window.removeEventListener("focus", updateDay);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!household || !user || loadedUserId !== user.id || householdError)
      return;
    let active = true;
    setResult((previous) => ({
      key: requestKey,
      transactions: previous?.key === requestKey ? previous.transactions : null,
      error: null,
      loading: true,
    }));
    const period = getAnalyticsPeriod(month, today);
    void getTransactionsByDateRange(
      household.id,
      period.fetchStart,
      period.fetchEnd,
    )
      .then((transactions) => {
        if (active)
          setResult({
            key: requestKey,
            transactions,
            error: null,
            loading: false,
          });
      })
      .catch((error: unknown) => {
        if (active)
          setResult({
            key: requestKey,
            transactions: [],
            error:
              error instanceof Error
                ? error.message
                : "集計データを取得できませんでした",
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [
    household,
    householdError,
    user,
    loadedUserId,
    requestKey,
    month,
    today,
    reload,
  ]);

  const analysis = useMemo(
    () =>
      result &&
      result.transactions !== null &&
      result.key === requestKey &&
      !result.error
        ? buildDashboardAnalysis(result.transactions, month, today)
        : null,
    [result, requestKey, month, today],
  );

  const changeMonth = (next: string) => {
    if (isValidMonth(next)) {
      setEditing(null);
      router.replace(`/dashboard?month=${next}`, { scroll: false });
    }
  };
  const refresh = () => setReload((count) => count + 1);
  const handleSaved = async () => {
    refresh();
    if (household) {
      // 保存は成功済み。残高再取得の失敗で保存失敗と誤認させない。
      try {
        await useSettlementStore.getState().loadBalances(household.id);
      } catch {
        toast.error("保存しましたが、精算残高を再取得できませんでした");
      }
    }
  };
  const handleDelete = async (transaction: Transaction) => {
    if (
      !window.confirm(
        `${transaction.place || transaction.note || "この取引"}（¥${transaction.amount.toLocaleString()}）を削除しますか？`,
      )
    )
      return;
    try {
      await useTransactionStore.getState().removeTransaction(transaction.id);
      toast.success("取引を削除しました");
      await handleSaved();
    } catch (error) {
      useTransactionStore.getState().clearError();
      toast.error(
        error instanceof Error ? error.message : "取引を削除できませんでした",
      );
    }
  };
  const transactionError = useTransactionStore((s) => s.error);
  useEffect(() => {
    if (!editing || !transactionError) return;
    toast.error(transactionError);
    useTransactionStore.getState().clearError();
  }, [transactionError, editing]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              概要に戻る
            </Link>
          </Button>
          <p className="text-sm text-gray-600">
            {loadedUserId === user?.id ? household?.name : "ふたりの財布"}
          </p>
        </div>
      </header>
      <main
        className="mx-auto max-w-5xl space-y-6 px-4 py-6"
        aria-busy={result?.loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="前の月へ"
              disabled={!isValidMonth(shiftAnalyticsMonth(month, -1))}
              onClick={() => changeMonth(shiftAnalyticsMonth(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <label className="sr-only" htmlFor="analytics-month">
              対象月
            </label>
            <input
              id="analytics-month"
              type="month"
              min="1900-01"
              max="8999-12"
              value={month}
              onChange={(event) => changeMonth(event.target.value)}
              className="min-h-11 min-w-0 max-w-48 rounded-md border bg-white px-2 text-base"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="次の月へ"
              disabled={!isValidMonth(shiftAnalyticsMonth(month, 1))}
              onClick={() => changeMonth(shiftAnalyticsMonth(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => changeMonth(today.slice(0, 7))}
            >
              今月
            </Button>
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={refresh}
              disabled={result?.loading}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              再読み込み
            </Button>
          </div>
        </div>
        {authLoading || (user && loadedUserId !== user.id) ? (
          <p role="status" className="py-12 text-center text-gray-500">
            読み込み中...
          </p>
        ) : !user ? (
          <p>
            ログインが必要です。
            <Link className="text-blue-600 underline" href="/auth">
              ログインへ
            </Link>
          </p>
        ) : householdError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-white p-6"
          >
            <p>{householdError}</p>
            <Button
              className="mt-3"
              onClick={() => {
                setLoadedUserId(null);
                setHouseholdRetry((n) => n + 1);
              }}
            >
              再試行
            </Button>
          </div>
        ) : !household ? (
          <p className="rounded-lg border bg-white p-6">
            概要画面で世帯を作成するか、世帯に参加してください。
          </p>
        ) : result?.key === requestKey && result.error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-white p-6"
          >
            <p>{result.error}</p>
            <Button className="mt-3" onClick={refresh}>
              再試行
            </Button>
          </div>
        ) : !analysis ? (
          <p role="status" className="py-12 text-center text-gray-500">
            集計データを読み込み中...
          </p>
        ) : (
          <AnalyticsDashboardView
            key={`${household.id}:${month}`}
            analysis={analysis}
            members={members}
            onMonthChange={changeMonth}
            paceMode={paceMode}
            onPaceModeChange={setPaceMode}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        )}
      </main>
      {household && editingSource && (
        <TransactionModal
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          householdId={household.id}
          members={members}
          source={editingSource}
          onSuccess={handleSaved}
        />
      )}
    </div>
  );
}
