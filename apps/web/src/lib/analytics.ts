import {
  calculateTransactionSummary,
  getExpenseBreakdownCategory,
  getExpenseBreakdownKey,
  isHouseholdExpense,
  type ExpenseBreakdownKey,
} from "@/lib/dashboard";
import type { Transaction } from "@/types/transaction";

export type PaceMode = "daily" | "weekly" | "cumulative";

export function isValidMonth(value: string | null): value is string {
  return value !== null && /^(19\d{2}|[2-8]\d{3})-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftAnalyticsMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function monthDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

export function formatAnalyticsMonth(month: string): string {
  return `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
}

export function getAnalyticsPeriod(month: string, today: string) {
  const currentMonth = today.slice(0, 7);
  const elapsedDays =
    month > currentMonth
      ? 0
      : month === currentMonth
        ? Number(today.slice(8))
        : daysInMonth(month);
  const previousMonth = shiftAnalyticsMonth(month, -1);
  const previousDays =
    elapsedDays === 0
      ? 0
      : month === currentMonth
        ? Math.min(elapsedDays, daysInMonth(previousMonth))
        : daysInMonth(previousMonth);
  return {
    month,
    previousMonth,
    elapsedDays,
    previousDays,
    isCurrent: month === currentMonth,
    isFuture: month > currentMonth,
    endDate: elapsedDays ? monthDate(month, elapsedDays) : null,
    previousEndDate: previousDays
      ? monthDate(previousMonth, previousDays)
      : null,
    // 6か月の推移には対象月の前月も含まれる。
    fetchStart: monthDate(shiftAnalyticsMonth(month, -5), 1),
    fetchEnd: monthDate(month, daysInMonth(month)),
  };
}

export interface PacePoint {
  key: string;
  label: string;
  day: number;
  amount: number | null;
  cumulative: number | null;
  previousCumulative: number | null;
  startDate: string;
  endDate: string;
  dayCount: number;
  partial: boolean;
}

export interface CategoryComparison {
  key: ExpenseBreakdownKey;
  label: string;
  amount: number;
  previousAmount: number;
  difference: number;
}

function inMonthThrough(
  transaction: Transaction,
  month: string,
  end: string | null,
): boolean {
  return (
    end !== null &&
    transaction.occurredOn >= monthDate(month, 1) &&
    transaction.occurredOn <= end
  );
}

export function buildDashboardAnalysis(
  transactions: Transaction[],
  month: string,
  today: string,
) {
  const period = getAnalyticsPeriod(month, today);
  const current = transactions.filter((t) =>
    inMonthThrough(t, month, period.endDate),
  );
  const previous = transactions.filter((t) =>
    inMonthThrough(t, period.previousMonth, period.previousEndDate),
  );
  const expenses = current.filter(isHouseholdExpense);
  const previousExpenses = previous.filter(isHouseholdExpense);
  const summary = calculateTransactionSummary(current);
  const previousSummary = calculateTransactionSummary(previous);
  const currentByDay = new Map<number, number>();
  const previousByDay = new Map<number, number>();
  for (const transaction of expenses) {
    const day = Number(transaction.occurredOn.slice(8));
    currentByDay.set(day, (currentByDay.get(day) ?? 0) + transaction.amount);
  }
  for (const transaction of previousExpenses) {
    const day = Number(transaction.occurredOn.slice(8));
    previousByDay.set(day, (previousByDay.get(day) ?? 0) + transaction.amount);
  }

  let cumulative = 0;
  let previousCumulative = 0;
  const daily: PacePoint[] = Array.from(
    { length: daysInMonth(month) },
    (_, i) => {
      const day = i + 1;
      const elapsed = day <= period.elapsedDays;
      const previousElapsed = !period.isFuture && day <= period.previousDays;
      if (elapsed) cumulative += currentByDay.get(day) ?? 0;
      if (previousElapsed) previousCumulative += previousByDay.get(day) ?? 0;
      return {
        key: String(day),
        label: `${day}日`,
        day,
        amount: elapsed ? (currentByDay.get(day) ?? 0) : null,
        cumulative: elapsed ? cumulative : null,
        previousCumulative: previousElapsed ? previousCumulative : null,
        startDate: monthDate(month, day),
        endDate: monthDate(month, day),
        dayCount: elapsed ? 1 : 0,
        partial: false,
      };
    },
  );

  const weekly: PacePoint[] = [];
  const [year, monthNumber] = month.split("-").map(Number);
  for (const point of daily) {
    const weekday = new Date(
      Date.UTC(year, monthNumber - 1, point.day),
    ).getUTCDay();
    if (point.day === 1 || weekday === 1) {
      weekly.push({
        ...point,
        key: `week-${point.day}`,
        amount: null,
        cumulative: null,
        previousCumulative: null,
        dayCount: 0,
      });
    }
    const week = weekly[weekly.length - 1];
    week.endDate = point.endDate;
    if (point.amount !== null) {
      week.amount = (week.amount ?? 0) + point.amount;
      week.dayCount += 1;
    }
    const startDay = Number(week.startDate.slice(8));
    week.label = `${startDay}〜${point.day}日`;
    week.partial = week.dayCount < 7;
  }

  const categories = new Map<ExpenseBreakdownKey, CategoryComparison>();
  for (const [list, field] of [
    [expenses, "amount"],
    [previousExpenses, "previousAmount"],
  ] as const) {
    for (const transaction of list) {
      const key = getExpenseBreakdownKey(transaction);
      const entry = categories.get(key) ?? {
        key,
        label: getExpenseBreakdownCategory(key).label,
        amount: 0,
        previousAmount: 0,
        difference: 0,
      };
      entry[field] += transaction.amount;
      entry.difference = entry.amount - entry.previousAmount;
      categories.set(key, entry);
    }
  }

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const value = shiftAnalyticsMonth(month, i - 5);
    const end =
      value > today.slice(0, 7)
        ? null
        : value === today.slice(0, 7)
          ? today
          : monthDate(value, daysInMonth(value));
    const records = transactions.filter((t) => inMonthThrough(t, value, end));
    return {
      month: value,
      label: `${Number(value.slice(5))}月`,
      amount:
        end === null ? null : calculateTransactionSummary(records).expenseTotal,
      hasRecords: records.length > 0,
      partial: value === today.slice(0, 7),
    };
  });

  return {
    period,
    summary,
    previousSummary,
    expenses,
    difference: summary.expenseTotal - previousSummary.expenseTotal,
    differenceRatio:
      previousSummary.expenseTotal === 0
        ? null
        : (summary.expenseTotal - previousSummary.expenseTotal) /
          previousSummary.expenseTotal,
    hasRecords: current.length > 0,
    hasPreviousRecords: previous.length > 0,
    daily,
    weekly,
    monthly,
    categories: [...categories.values()],
  };
}

export type DashboardAnalysis = ReturnType<typeof buildDashboardAnalysis>;
