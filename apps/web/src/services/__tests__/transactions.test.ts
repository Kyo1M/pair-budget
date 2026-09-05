import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import {
  getTransactions,
  getTransactionsByDateRange,
} from "@/services/transactions";

type Row = Database["public"]["Tables"]["transactions"]["Row"];
const mocks = vi.hoisted(() => ({
  rows: [] as Row[],
  cap: 500,
  failOffset: -1,
  ranges: [] as number[],
  receiptBatches: [] as string[][],
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from(table: string) {
      if (table === "receipt_scans") {
        return {
          select: () => ({
            in: (_key: string, ids: string[]) => {
              mocks.receiptBatches.push(ids);
              return {
                eq: async () => ({
                  data: ids.map((id) => ({
                    transaction_id: id,
                    id: `scan-${id}`,
                  })),
                }),
              };
            },
          }),
        };
      }
      let start = "",
        end = "9999-12-31";
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        gte: (_key: string, date: string) => {
          start = date;
          return query;
        },
        lte: (_key: string, date: string) => {
          end = date;
          return query;
        },
        range: async (offset: number, last: number) => {
          mocks.ranges.push(offset);
          if (offset === mocks.failOffset)
            return { data: null, error: { message: "network failure" } };
          const rows = mocks.rows.filter(
            (r) => r.occurred_on >= start && r.occurred_on <= end,
          );
          return {
            data: rows.slice(offset, Math.min(last + 1, offset + mocks.cap)),
            error: null,
          };
        },
      };
      return query;
    },
  }),
}));

beforeEach(() => {
  mocks.cap = 500;
  mocks.failOffset = -1;
  mocks.ranges = [];
  mocks.receiptBatches = [];
  mocks.rows = Array.from(
    { length: 1205 },
    (_, i): Row => ({
      id: `tx-${i}`,
      household_id: "h1",
      type: "expense",
      amount: 100,
      occurred_on: "2026-08-01",
      category: "groceries",
      note: null,
      place: null,
      payer_user_id: null,
      advance_to_user_id: null,
      recurring_expense_id: null,
      recurring_income_id: null,
      created_by: "u1",
      created_at: "",
      updated_at: "",
    }),
  );
});

describe("paginated transaction retrieval", () => {
  it("1,000件を超える期間の全取引と画像の関連付けを取得する", async () => {
    const rows = await getTransactionsByDateRange(
      "h1",
      "2026-08-01",
      "2026-08-31",
    );
    expect(rows).toHaveLength(1205);
    expect(new Set(rows.map((row) => row.id)).size).toBe(1205);
    expect(rows.reduce((total, row) => total + row.amount, 0)).toBe(120500);
    expect(rows.at(-1)?.receiptScanId).toBe("scan-tx-1204");
    expect(mocks.ranges).toEqual([0, 500, 1000, 1205]);
    expect(mocks.receiptBatches.every((ids) => ids.length <= 100)).toBe(true);
  });
  it("API側の小さい件数上限でも途中で取得をやめない", async () => {
    mocks.cap = 100;
    const rows = await getTransactions("h1", "2026-08");
    expect(rows).toHaveLength(1205);
    expect(mocks.ranges.at(-1)).toBe(1205);
  });
  it("途中のページが失敗した場合に不完全な合計を返さない", async () => {
    mocks.failOffset = 500;
    await expect(
      getTransactionsByDateRange("h1", "2026-08-01", "2026-08-31"),
    ).rejects.toThrow("取引の取得に失敗");
  });
  it("指定月の外側を取得せず、空の期間を正しく返す", async () => {
    expect(await getTransactions("h1", "2026-07")).toEqual([]);
    expect(mocks.receiptBatches).toHaveLength(0);
  });
});
