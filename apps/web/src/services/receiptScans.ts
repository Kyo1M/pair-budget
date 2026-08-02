import { createClient } from '@/lib/supabase/client';
import { getReceiptFileExtension } from '@/lib/receiptImage';
import { createUuid } from '@/lib/uuid';
import type { Database, Json } from '@/types/supabase';
import type {
  ReceiptOcrResult,
  ReceiptRegistrationData,
  ReceiptScan,
  ReceiptScanStatus,
} from '@/types/receipt';
import { RECEIPT_SCAN_STATUSES, receiptOcrResultSchema } from '@/types/receipt';
import type { Transaction } from '@/types/transaction';
import { mapTransaction } from '@/services/transactions';

const RECEIPT_BUCKET = 'receipt-images';
type ReceiptScanRow = Database['public']['Tables']['receipt_scans']['Row'];

function isReceiptScanStatus(value: string): value is ReceiptScanStatus {
  return (RECEIPT_SCAN_STATUSES as readonly string[]).includes(value);
}

export function mapReceiptScan(row: ReceiptScanRow): ReceiptScan {
  const parsedResult = row.ocr_result
    ? receiptOcrResultSchema.safeParse(row.ocr_result)
    : null;

  return {
    id: row.id,
    householdId: row.household_id,
    createdBy: row.created_by,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: isReceiptScanStatus(row.status) ? row.status : 'failed',
    ocrResult: parsedResult?.success ? parsedResult.data : null,
    ocrError:
      row.ocr_result && parsedResult && !parsedResult.success
        ? 'OCR結果の形式が不正です'
        : row.ocr_error,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReceiptDrafts(householdId: string): Promise<ReceiptScan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('receipt_scans')
    .select('*')
    .eq('household_id', householdId)
    .in('status', ['pending', 'processing', 'ready', 'failed'])
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('レシート下書きの取得に失敗しました');
  }
  return (data as ReceiptScanRow[]).map(mapReceiptScan);
}

export async function createReceiptDraft(
  householdId: string,
  userId: string,
  file: File
): Promise<ReceiptScan> {
  const supabase = createClient();
  const id = createUuid();
  const extension = getReceiptFileExtension(file.type);
  const storagePath = `${householdId}/${userId}/${id}.${extension}`;
  const payload: Database['public']['Tables']['receipt_scans']['Insert'] = {
    id,
    household_id: householdId,
    created_by: userId,
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    status: 'pending',
  };

  const { data: row, error: rowError } = await supabase
    .from('receipt_scans')
    .insert(payload)
    .select('*')
    .single();
  if (rowError || !row) {
    throw new Error('レシート下書きを作成できませんでした');
  }

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    await supabase.from('receipt_scans').delete().eq('id', id);
    throw new Error('レシート画像の保存に失敗しました');
  }

  return mapReceiptScan(row as ReceiptScanRow);
}

export async function analyzeReceiptDraft(scanId: string): Promise<ReceiptScan> {
  const response = await fetch(`/api/receipt-scans/${scanId}/analyze`, {
    method: 'POST',
  });
  const body = (await response.json().catch(() => null)) as
    | { scan?: ReceiptScan; error?: string }
    | null;
  if (!response.ok || !body?.scan) {
    throw new Error(body?.error || 'レシート解析に失敗しました');
  }
  return body.scan;
}

export async function registerReceiptDraft(
  scanId: string,
  input: ReceiptRegistrationData
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('register_receipt_scan', {
    target_scan_id: scanId,
    target_type: input.type,
    target_amount: input.amount,
    target_occurred_on: input.occurredOn,
    target_category: input.category,
    target_note: input.note ?? null,
    target_place: input.place ?? null,
    target_payer_user_id: input.payerUserId,
    target_advance_to_user_id:
      input.type === 'advance' ? input.advanceToUserId ?? null : null,
  });

  if (error || !data?.[0]) {
    throw new Error('レシートから取引を登録できませんでした');
  }
  return mapTransaction(data[0], scanId);
}

export async function removeReceiptDraft(scan: ReceiptScan): Promise<void> {
  const supabase = createClient();
  const { error: storageError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .remove([scan.storagePath]);
  if (storageError) {
    throw new Error('レシート画像を削除できませんでした');
  }
  const { error: rowError } = await supabase.from('receipt_scans').delete().eq('id', scan.id);
  if (rowError) {
    throw new Error('レシート下書きを削除できませんでした');
  }
}

export async function cleanupOrphanedReceipts(householdId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('receipt_scans')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'orphaned');
  if (error || !data?.length) {
    return;
  }

  for (const row of data as ReceiptScanRow[]) {
    const { error: storageError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .remove([row.storage_path]);
    if (!storageError) {
      await supabase.from('receipt_scans').delete().eq('id', row.id);
    }
  }
}

export async function createReceiptSignedUrl(scanId: string): Promise<string> {
  const supabase = createClient();
  const { data: scan, error: scanError } = await supabase
    .from('receipt_scans')
    .select('storage_path')
    .eq('id', scanId)
    .single();
  if (scanError || !scan) {
    throw new Error('レシート画像を取得できませんでした');
  }
  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(scan.storage_path, 300);
  if (error || !data?.signedUrl) {
    throw new Error('レシート画像を開けませんでした');
  }
  return data.signedUrl;
}

export function serializeOcrResult(result: ReceiptOcrResult): Json {
  return result as unknown as Json;
}
