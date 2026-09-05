import { describe, expect, it } from "vitest";
import {
  calculateExpenseCategoryBreakdown,
  calculateTransactionSummary,
  isHouseholdExpense,
} from "@/lib/dashboard";
import type { Transaction } from "@/types/transaction";

/**
 * テスト用の取引を生成するファクトリ
 */
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    householdId: "hh-1",
    type: "expense",
    amount: 1000,
    occurredOn: "2026-05-15",
    category: "groceries",
    note: null,
    payerUserId: null,
    advanceToUserId: null,
    place: null,
    recurringExpenseId: null,
    recurringIncomeId: null,
    receiptScanId: null,
    createdBy: "user-1",
    createdAt: "2026-05-15T00:00:00Z",
    updatedAt: "2026-05-15T00:00:00Z",
    ...overrides,
  };
}

describe("isHouseholdExpense", () => {
  it("支出 (expense) は家計の支出に含める", () => {
    expect(isHouseholdExpense(makeTx({ type: "expense" }))).toBe(true);
  });

  it("収入 (income) は家計の支出ではない", () => {
    expect(
      isHouseholdExpense(makeTx({ type: "income", category: "salary" })),
    ).toBe(false);
  });

  it("世帯向け立替 (advanceToUserId == null) は家計の支出に含める", () => {
    expect(
      isHouseholdExpense(makeTx({ type: "advance", advanceToUserId: null })),
    ).toBe(true);
  });

  it("個人向け立替 (advanceToUserId != null) は家計の支出に含めない", () => {
    expect(
      isHouseholdExpense(
        makeTx({ type: "advance", advanceToUserId: "user-2" }),
      ),
    ).toBe(false);
  });
});

describe("calculateTransactionSummary", () => {
  it("空配列なら全て 0 を返す", () => {
    expect(calculateTransactionSummary([])).toEqual({
      incomeTotal: 0,
      expenseTotal: 0,
      balance: 0,
    });
  });

  it("収入は収入合計へ、支出は支出合計へ計上する", () => {
    const result = calculateTransactionSummary([
      makeTx({ id: "a", type: "income", category: "salary", amount: 300000 }),
      makeTx({ id: "b", type: "expense", amount: 1000 }),
      makeTx({ id: "c", type: "expense", amount: 2000 }),
    ]);
    expect(result.incomeTotal).toBe(300000);
    expect(result.expenseTotal).toBe(3000);
    expect(result.balance).toBe(297000);
  });

  it("世帯向け立替は支出合計に含め、個人向け立替は除外する", () => {
    const result = calculateTransactionSummary([
      makeTx({ id: "a", type: "expense", amount: 1000 }),
      // 世帯向け立替（家賃を片方が建て替え）→ 支出に含む
      makeTx({ id: "b", type: "advance", advanceToUserId: null, amount: 5000 }),
      // 個人向け立替（相手の個人支出を建て替え＝貸付）→ 除外
      makeTx({
        id: "c",
        type: "advance",
        advanceToUserId: "user-2",
        amount: 9999,
      }),
    ]);
    expect(result.expenseTotal).toBe(6000);
    expect(result.incomeTotal).toBe(0);
    expect(result.balance).toBe(-6000);
  });
});

describe("calculateExpenseCategoryBreakdown", () => {
  it("未分類の支出も含め、全体支出と内訳の総額が一致する", () => {
    const transactions = [
      makeTx({ category: null, amount: 300 }),
      makeTx({ category: "other", amount: 200 }),
    ];
    const breakdown = calculateExpenseCategoryBreakdown(transactions);
    expect(breakdown.total).toBe(
      calculateTransactionSummary(transactions).expenseTotal,
    );
    expect(
      breakdown.items.find((item) => item.key === "uncategorized"),
    ).toMatchObject({ amount: 300, category: { label: "未分類" } });
  });
  it("総額が 0 のときは空の内訳を返す", () => {
    expect(calculateExpenseCategoryBreakdown([])).toEqual({
      total: 0,
      items: [],
    });
  });

  it("支出と世帯向け立替を合算し、金額の降順で内訳を返す", () => {
    const { total, items } = calculateExpenseCategoryBreakdown([
      makeTx({ id: "a", type: "expense", category: "groceries", amount: 1000 }),
      makeTx({ id: "b", type: "expense", category: "dining", amount: 3000 }),
      // 世帯向け立替（食費）→ groceries に合算
      makeTx({
        id: "c",
        type: "advance",
        advanceToUserId: null,
        category: "groceries",
        amount: 500,
      }),
    ]);

    expect(total).toBe(4500);
    expect(items[0]).toMatchObject({ key: "dining", amount: 3000 });
    expect(items[1]).toMatchObject({ key: "groceries", amount: 1500 });
    // 割合の合計は 1 になる
    expect(items.reduce((sum, item) => sum + item.ratio, 0)).toBeCloseTo(1, 5);
  });

  it("個人向け立替は既定では除外し、includeAdvance=true で含める", () => {
    const transactions = [
      makeTx({ id: "a", type: "expense", category: "groceries", amount: 1000 }),
      makeTx({
        id: "b",
        type: "advance",
        advanceToUserId: "user-2",
        category: "daily",
        amount: 2000,
      }),
    ];

    const excluded = calculateExpenseCategoryBreakdown(transactions);
    expect(excluded.total).toBe(1000);
    expect(excluded.items).toHaveLength(1);

    const included = calculateExpenseCategoryBreakdown(transactions, {
      includeAdvance: true,
    });
    expect(included.total).toBe(3000);
    expect(included.items).toHaveLength(2);
  });
});
