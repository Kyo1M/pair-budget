import { describe, expect, it } from "vitest";
import {
  buildDashboardAnalysis,
  getAnalyticsPeriod,
  isValidMonth,
} from "@/lib/analytics";
import type { Transaction } from "@/types/transaction";

function tx(
  date: string,
  amount: number,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: date,
    householdId: "h1",
    type: "expense",
    amount,
    occurredOn: date,
    category: "groceries",
    note: null,
    place: null,
    payerUserId: "u1",
    advanceToUserId: null,
    recurringExpenseId: null,
    recurringIncomeId: null,
    receiptScanId: null,
    createdBy: "u1",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("dashboard analysis", () => {
  it("日別・週別・累計・カテゴリが同じ家計支出を集計し、収入と個人向け立替を除外する", () => {
    const result = buildDashboardAnalysis(
      [
        tx("2026-08-01", 100),
        tx("2026-08-02", 200, { type: "advance" }),
        tx("2026-08-03", 300, { category: null }),
        tx("2026-08-31", 400),
        tx("2026-08-03", 900, { type: "advance", advanceToUserId: "u2" }),
        tx("2026-08-03", 5000, { type: "income", category: "salary" }),
      ],
      "2026-08",
      "2026-09-05",
    );
    expect(result.summary).toEqual({
      expenseTotal: 1000,
      incomeTotal: 5000,
      balance: 4000,
    });
    expect(result.daily.reduce((sum, day) => sum + (day.amount ?? 0), 0)).toBe(
      1000,
    );
    expect(
      result.weekly.reduce((sum, week) => sum + (week.amount ?? 0), 0),
    ).toBe(1000);
    expect(result.daily.at(-1)?.cumulative).toBe(1000);
    expect(
      result.categories.reduce((sum, category) => sum + category.amount, 0),
    ).toBe(1000);
    expect(
      result.categories.find((category) => category.key === "uncategorized"),
    ).toMatchObject({ label: "未分類", amount: 300 });
  });

  it("現在月は前月同日までと比較し、未来の取引を全ての集計から除外する", () => {
    const result = buildDashboardAnalysis(
      [
        tx("2026-09-01", 100),
        tx("2026-09-05", 200),
        tx("2026-09-06", 999),
        tx("2026-08-05", 50),
        tx("2026-08-06", 600),
      ],
      "2026-09",
      "2026-09-05",
    );
    expect(result.summary.expenseTotal).toBe(300);
    expect(result.previousSummary.expenseTotal).toBe(50);
    expect(result.difference).toBe(250);
    expect(result.daily[1].amount).toBe(0);
    expect(result.daily[5]).toMatchObject({
      amount: null,
      cumulative: null,
      previousCumulative: null,
    });
    expect(result.weekly[0]).toMatchObject({
      label: "1〜6日",
      amount: 300,
      dayCount: 5,
      partial: true,
    });
    expect(result.weekly[1].amount).toBeNull();
    expect(result.monthly.at(-1)?.amount).toBe(300);
  });

  it("月またぎの週に前月・翌月の取引を混ぜず、月曜始まりの週で合算する", () => {
    const result = buildDashboardAnalysis(
      [
        tx("2026-07-31", 9000),
        tx("2026-08-01", 100),
        tx("2026-08-02", 200),
        tx("2026-08-03", 300),
        tx("2026-08-09", 400),
        tx("2026-08-31", 500),
        tx("2026-09-01", 9999),
      ],
      "2026-08",
      "2026-09-05",
    );
    expect(result.weekly).toHaveLength(6);
    expect(result.weekly[0]).toMatchObject({
      label: "1〜2日",
      amount: 300,
      dayCount: 2,
    });
    expect(result.weekly[1]).toMatchObject({
      label: "3〜9日",
      amount: 700,
      dayCount: 7,
      partial: false,
    });
    expect(result.weekly[5]).toMatchObject({
      label: "31〜31日",
      amount: 500,
      dayCount: 1,
    });
  });

  it("うるう年・前月より長い月で前月の架空の日付を補間しない", () => {
    expect(
      buildDashboardAnalysis([], "2024-02", "2024-03-01").daily,
    ).toHaveLength(29);
    const result = buildDashboardAnalysis(
      [tx("2026-02-28", 100)],
      "2026-03",
      "2026-03-31",
    );
    expect(result.period.previousDays).toBe(28);
    expect(result.daily[27].previousCumulative).toBe(100);
    expect(result.daily[28].previousCumulative).toBeNull();
    expect(result.weekly[0]).toMatchObject({ dayCount: 1, label: "1〜1日" });
  });

  it("月曜から始まる月と年またぎの期間を扱う", () => {
    const result = buildDashboardAnalysis([], "2026-06", "2026-07-01");
    expect(result.weekly[0]).toMatchObject({ dayCount: 7, label: "1〜7日" });
    expect(getAnalyticsPeriod("2026-01", "2026-01-05")).toMatchObject({
      previousMonth: "2025-12",
      fetchStart: "2025-08-01",
      previousEndDate: "2025-12-05",
    });
  });

  it("未来月は0円ではなく未到来とし、前月0円の増減率は計算しない", () => {
    const future = buildDashboardAnalysis(
      [tx("2026-10-01", 100)],
      "2026-10",
      "2026-09-05",
    );
    expect(future.period.isFuture).toBe(true);
    expect(future.daily.every((point) => point.amount === null)).toBe(true);
    expect(future.monthly.at(-1)?.amount).toBeNull();
    const empty = buildDashboardAnalysis([], "2026-08", "2026-09-05");
    expect(empty.hasRecords).toBe(false);
    expect(empty.differenceRatio).toBeNull();
  });

  it("前月にだけ存在するカテゴリを減少として残す", () => {
    const result = buildDashboardAnalysis(
      [tx("2026-07-10", 100, { category: "dining" })],
      "2026-08",
      "2026-09-05",
    );
    expect(result.categories).toEqual([
      {
        key: "dining",
        label: "外食費",
        amount: 0,
        previousAmount: 100,
        difference: -100,
      },
    ]);
  });

  it("月のURL値を検証する", () => {
    expect(isValidMonth("2026-08")).toBe(true);
    for (const value of [null, "", "2026-13", "2026-1", "26-01", "<script>"])
      expect(isValidMonth(value)).toBe(false);
  });
});
