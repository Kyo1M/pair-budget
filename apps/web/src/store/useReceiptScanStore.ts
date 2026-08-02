import { create } from 'zustand';
import { prepareReceiptImage } from '@/lib/receiptImage';
import {
  analyzeReceiptDraft,
  cleanupOrphanedReceipts,
  createReceiptDraft,
  listReceiptDrafts,
  registerReceiptDraft,
  removeReceiptDraft,
} from '@/services/receiptScans';
import type { ReceiptRegistrationData, ReceiptScan } from '@/types/receipt';
import type { Transaction } from '@/types/transaction';

interface ReceiptScanStore {
  scans: ReceiptScan[];
  isLoading: boolean;
  isUploading: boolean;
  analyzingIds: string[];
  isRegistering: boolean;
  error: string | null;
  loadDrafts: (householdId: string) => Promise<void>;
  captureReceipt: (householdId: string, userId: string, file: File) => Promise<ReceiptScan>;
  retryAnalysis: (scanId: string) => void;
  registerScan: (scanId: string, data: ReceiptRegistrationData) => Promise<Transaction>;
  removeScan: (scan: ReceiptScan) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const MAX_CONCURRENT_ANALYSES = 2;
const analysisQueue: string[] = [];
const queuedIds = new Set<string>();
let activeAnalyses = 0;

function replaceScan(scans: ReceiptScan[], updated: ReceiptScan): ReceiptScan[] {
  return scans.map((scan) => (scan.id === updated.id ? updated : scan));
}

function queueAnalysis(scanId: string) {
  if (queuedIds.has(scanId)) {
    return;
  }
  queuedIds.add(scanId);
  analysisQueue.push(scanId);
  drainAnalysisQueue();
}

function drainAnalysisQueue() {
  while (activeAnalyses < MAX_CONCURRENT_ANALYSES && analysisQueue.length > 0) {
    const scanId = analysisQueue.shift();
    if (!scanId) {
      return;
    }
    queuedIds.delete(scanId);
    activeAnalyses += 1;
    useReceiptScanStore.setState((state) => ({
      analyzingIds: [...new Set([...state.analyzingIds, scanId])],
      scans: state.scans.map((scan) =>
        scan.id === scanId ? { ...scan, status: 'processing', ocrError: null } : scan
      ),
    }));

    void analyzeReceiptDraft(scanId)
      .then((updated) => {
        useReceiptScanStore.setState((state) => ({
          scans: replaceScan(state.scans, updated),
        }));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'レシート解析に失敗しました';
        useReceiptScanStore.setState((state) => ({
          scans: state.scans.map((scan) =>
            scan.id === scanId
              ? { ...scan, status: 'failed', ocrError: message }
              : scan
          ),
          error: message,
        }));
      })
      .finally(() => {
        activeAnalyses -= 1;
        useReceiptScanStore.setState((state) => ({
          analyzingIds: state.analyzingIds.filter((id) => id !== scanId),
        }));
        drainAnalysisQueue();
      });
  }
}

export const useReceiptScanStore = create<ReceiptScanStore>((set) => ({
  scans: [],
  isLoading: false,
  isUploading: false,
  analyzingIds: [],
  isRegistering: false,
  error: null,

  loadDrafts: async (householdId) => {
    set({ isLoading: true, error: null });
    try {
      await cleanupOrphanedReceipts(householdId);
      const scans = await listReceiptDrafts(householdId);
      set({ scans, isLoading: false });
      scans
        .filter((scan) => scan.status === 'pending' || scan.status === 'processing')
        .forEach((scan) => queueAnalysis(scan.id));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '下書きの取得に失敗しました',
      });
    }
  },

  captureReceipt: async (householdId, userId, file) => {
    set({ isUploading: true, error: null });
    try {
      const prepared = await prepareReceiptImage(file);
      const scan = await createReceiptDraft(householdId, userId, prepared);
      set((state) => ({ scans: [...state.scans, scan], isUploading: false }));
      queueAnalysis(scan.id);
      return scan;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'レシート画像を保存できませんでした';
      set({ isUploading: false, error: message });
      throw error;
    }
  },

  retryAnalysis: (scanId) => {
    set({ error: null });
    queueAnalysis(scanId);
  },

  registerScan: async (scanId, data) => {
    set({ isRegistering: true, error: null });
    try {
      const transaction = await registerReceiptDraft(scanId, data);
      set((state) => ({
        scans: state.scans.filter((scan) => scan.id !== scanId),
        isRegistering: false,
      }));
      return transaction;
    } catch (error) {
      const message = error instanceof Error ? error.message : '取引を登録できませんでした';
      set({ isRegistering: false, error: message });
      throw error;
    }
  },

  removeScan: async (scan) => {
    set({ error: null });
    await removeReceiptDraft(scan);
    set((state) => ({ scans: state.scans.filter((item) => item.id !== scan.id) }));
  },

  clearError: () => set({ error: null }),
  reset: () => set({ scans: [], error: null, analyzingIds: [] }),
}));

