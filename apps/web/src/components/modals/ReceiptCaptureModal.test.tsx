import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptCaptureModal } from "./ReceiptCaptureModal";
import type { ReceiptScan } from "@/types/receipt";

const mocks = vi.hoisted(() => ({
  loadDrafts: vi.fn().mockResolvedValue(undefined),
  captureReceipt: vi.fn(),
  retryAnalysis: vi.fn(),
  registerScan: vi.fn(),
  removeScan: vi.fn(),
  addExistingTransaction: vi.fn(),
}));

const scan: ReceiptScan = {
  id: "scan-1",
  householdId: "household-1",
  createdBy: "user-1",
  storagePath: "household-1/user-1/scan-1.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 120_000,
  status: "ready",
  ocrResult: {
    amount: 1280,
    occurredOn: "2026-08-03",
    category: "groceries",
    place: "テストスーパー",
    ambiguousFields: [],
    warnings: [],
  },
  ocrError: null,
  transactionId: null,
  createdAt: "2026-08-03T00:00:00Z",
  updatedAt: "2026-08-03T00:00:00Z",
};

vi.mock("@/store/useReceiptScanStore", () => ({
  useReceiptScanStore: (selector: (state: unknown) => unknown) =>
    selector({
      scans: [scan],
      isLoading: false,
      isUploading: false,
      isRegistering: false,
      loadDrafts: mocks.loadDrafts,
      captureReceipt: mocks.captureReceipt,
      retryAnalysis: mocks.retryAnalysis,
      registerScan: mocks.registerScan,
      removeScan: mocks.removeScan,
    }),
}));

vi.mock("@/store/useTransactionStore", () => ({
  useTransactionStore: (selector: (state: unknown) => unknown) =>
    selector({ addExistingTransaction: mocks.addExistingTransaction }),
}));

vi.mock("@/services/transactions", () => ({
  getPlaceSuggestions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/receipts/ReceiptPreview", () => ({
  ReceiptPreview: () => <div data-testid="receipt-preview" />,
}));

const members = [
  {
    id: "member-1",
    householdId: "household-1",
    userId: "user-1",
    role: "owner" as const,
    joinedAt: "2026-08-01T00:00:00Z",
    profile: { id: "user-1", email: "test@example.com", name: "太郎" },
  },
  {
    id: "member-2",
    householdId: "household-1",
    userId: "user-2",
    role: "member" as const,
    joinedAt: "2026-08-01T00:00:00Z",
    profile: { id: "user-2", email: "partner@example.com", name: "花子" },
  },
];

describe("ReceiptCaptureModal", () => {
  it("家庭向け立替チェックを入れ、編集を挟まず最初の登録で世帯向け立替として保存できる", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const onSuccess = vi.fn();
    mocks.registerScan.mockResolvedValue({
      id: "saved-transaction",
      type: "advance",
      amount: 1280,
    });
    render(
      <ReceiptCaptureModal
        open
        onOpenChange={vi.fn()}
        householdId="household-1"
        currentUserId={userId}
        members={[{ ...members[0], userId }]}
        onSuccess={onSuccess}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("金額")).toHaveValue("1280"),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /家庭の支出を一旦立替えた/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "確認して登録" }));
    await waitFor(() =>
      expect(mocks.registerScan).toHaveBeenCalledWith(
        "scan-1",
        expect.objectContaining({
          type: "advance",
          advanceToUserId: null,
          payerUserId: userId,
          amount: 1280,
        }),
      ),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
  it("OCR結果を手入力と同じ金額フォームで確認し、立替入力へ切り替えられる", async () => {
    render(
      <ReceiptCaptureModal
        open
        onOpenChange={vi.fn()}
        householdId="household-1"
        currentUserId="user-1"
        members={members}
      />,
    );

    const amount = await screen.findByLabelText("金額");
    await waitFor(() => expect(amount).toHaveValue("1280"));
    expect(amount).toHaveAttribute("inputmode", "numeric");
    expect(
      screen.getByRole("button", { name: "かんたん電卓を開く" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("場所（任意）")).toHaveValue("テストスーパー");
    expect(screen.queryByRole("tab", { name: "収入" })).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "立替" }), {
      button: 0,
      ctrlKey: false,
    });

    expect(await screen.findByLabelText("立替先")).toBeInTheDocument();
    expect(screen.getByLabelText("支払者")).toHaveValue("user-1");
  });
});
