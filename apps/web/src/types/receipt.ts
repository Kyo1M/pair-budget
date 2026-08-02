import { z } from 'zod';
import { EXPENSE_CATEGORY_KEYS, type ExpenseCategoryKey } from '@/types/transaction';

export const RECEIPT_SCAN_STATUSES = [
  'pending',
  'processing',
  'ready',
  'failed',
  'registered',
  'orphaned',
] as const;

export type ReceiptScanStatus = (typeof RECEIPT_SCAN_STATUSES)[number];

export const RECEIPT_AMBIGUOUS_FIELDS = [
  'amount',
  'occurredOn',
  'place',
  'category',
] as const;

export type ReceiptAmbiguousField = (typeof RECEIPT_AMBIGUOUS_FIELDS)[number];

const receiptDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, '日付が不正です');

export const receiptOcrResultSchema = z.object({
  amount: z.number().int().positive().nullable(),
  occurredOn: receiptDateSchema.nullable(),
  place: z.string().trim().max(50).nullable(),
  category: z.enum(EXPENSE_CATEGORY_KEYS).nullable(),
  ambiguousFields: z.array(z.enum(RECEIPT_AMBIGUOUS_FIELDS)).default([]),
  warnings: z.array(z.string().trim().min(1).max(200)).default([]),
});

export type ReceiptOcrResult = z.infer<typeof receiptOcrResultSchema>;

export interface ReceiptScan {
  id: string;
  householdId: string;
  createdBy: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  status: ReceiptScanStatus;
  ocrResult: ReceiptOcrResult | null;
  ocrError: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptRegistrationData {
  type: 'expense' | 'advance';
  amount: number;
  occurredOn: string;
  category: ExpenseCategoryKey;
  note?: string | null;
  place?: string | null;
  payerUserId: string;
  advanceToUserId?: string | null;
}

