'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReceiptPreview } from '@/components/receipts/ReceiptPreview';
import { getCategoriesByType } from '@/constants/categories';
import {
  transactionSchema,
  toTransactionData,
  type TransactionFormData,
} from '@/lib/validations/transaction';
import { useReceiptScanStore } from '@/store/useReceiptScanStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import type { HouseholdMember } from '@/types/household';
import type { ReceiptAmbiguousField, ReceiptScan } from '@/types/receipt';
import type { ExpenseCategoryKey, Transaction } from '@/types/transaction';

interface ReceiptCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  currentUserId: string;
  members: HouseholdMember[];
  onSuccess?: (transaction: Transaction) => Promise<void> | void;
}

function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

function getStatusLabel(scan: ReceiptScan): string {
  switch (scan.status) {
    case 'pending':
      return '解析待ち';
    case 'processing':
      return '解析中';
    case 'ready':
      return '確認できます';
    case 'failed':
      return '要対応';
    default:
      return scan.status;
  }
}

function fieldNeedsReview(scan: ReceiptScan, field: ReceiptAmbiguousField): boolean {
  const result = scan.ocrResult;
  if (!result) return scan.status === 'failed';
  return result[field] == null || result.ambiguousFields.includes(field);
}

export function ReceiptCaptureModal({
  open,
  onOpenChange,
  householdId,
  currentUserId,
  members,
  onSuccess,
}: ReceiptCaptureModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scans = useReceiptScanStore((state) => state.scans);
  const isLoading = useReceiptScanStore((state) => state.isLoading);
  const isUploading = useReceiptScanStore((state) => state.isUploading);
  const isRegistering = useReceiptScanStore((state) => state.isRegistering);
  const loadDrafts = useReceiptScanStore((state) => state.loadDrafts);
  const captureReceipt = useReceiptScanStore((state) => state.captureReceipt);
  const retryAnalysis = useReceiptScanStore((state) => state.retryAnalysis);
  const registerScan = useReceiptScanStore((state) => state.registerScan);
  const removeScan = useReceiptScanStore((state) => state.removeScan);
  const addExistingTransaction = useTransactionStore((state) => state.addExistingTransaction);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const selectedScan = scans.find((scan) => scan.id === selectedScanId) ?? null;
  const reviewableScans = useMemo(
    () => scans.filter((scan) => scan.status === 'ready' || scan.status === 'failed'),
    [scans]
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema) as Resolver<TransactionFormData>,
    defaultValues: {
      type: 'expense',
      amount: '' as unknown as number,
      occurredOn: '',
      category: 'other',
      note: '',
      place: '',
      isHouseholdAdvance: false,
      payerUserId: currentUserId,
      advanceToUserId: null,
    },
  });
  const transactionType = watch('type');
  const payerUserId = watch('payerUserId');

  useEffect(() => {
    if (open) {
      void loadDrafts(householdId);
    }
  }, [open, householdId, loadDrafts]);

  useEffect(() => {
    if (selectedScanId && scans.some((scan) => scan.id === selectedScanId)) {
      return;
    }
    setSelectedScanId(reviewableScans[0]?.id ?? scans[0]?.id ?? null);
  }, [reviewableScans, scans, selectedScanId]);

  useEffect(() => {
    if (!selectedScan) {
      return;
    }
    const result = selectedScan.ocrResult;
    reset({
      type: 'expense',
      amount: (result?.amount ?? '') as unknown as number,
      occurredOn: result?.occurredOn ?? '',
      category: result?.category ?? 'other',
      note: '',
      place: result?.place ?? '',
      isHouseholdAdvance: false,
      payerUserId: currentUserId,
      advanceToUserId: null,
    });
  }, [selectedScan, currentUserId, reset]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const scan = await captureReceipt(householdId, currentUserId, file);
      setSelectedScanId(scan.id);
      toast.success('レシートを保存しました', { description: '解析しながら次の撮影ができます' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '撮影画像を保存できませんでした');
    }
  };

  const handleRemove = async (scan: ReceiptScan) => {
    if (!confirm('このレシート下書きを削除しますか？')) return;
    try {
      await removeScan(scan);
      toast.success('下書きを削除しました');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '下書きを削除できませんでした');
    }
  };

  const onSubmit: SubmitHandler<TransactionFormData> = async (formData) => {
    if (!selectedScan || !['ready', 'failed'].includes(selectedScan.status)) return;
    const transactionData = toTransactionData(formData, householdId);
    if (transactionData.type === 'income' || !transactionData.payerUserId) {
      toast.error('レシートは支出または立替として登録してください');
      return;
    }
    try {
      const transaction = await registerScan(selectedScan.id, {
        type: transactionData.type,
        amount: transactionData.amount,
        occurredOn: transactionData.occurredOn,
        category: transactionData.category as ExpenseCategoryKey,
        note: transactionData.note,
        place: transactionData.place,
        payerUserId: transactionData.payerUserId,
        advanceToUserId: transactionData.advanceToUserId,
      });
      addExistingTransaction(transaction);
      await onSuccess?.(transaction);
      toast.success('レシートから取引を登録しました', {
        description: `¥${transaction.amount.toLocaleString()}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取引を登録できませんでした');
    }
  };

  const canReview = selectedScan?.status === 'ready' || selectedScan?.status === 'failed';
  const categories = getCategoriesByType(transactionType === 'advance' ? 'advance' : 'expense');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!left-0 !top-0 flex !h-[100dvh] !w-screen !max-h-none !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden !rounded-none border-0 p-0 sm:!max-w-none">
        <header className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-3 pr-12">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-10 shrink-0 px-2"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="mr-1 h-5 w-5" />
            戻る
          </Button>
          <DialogTitle className="sr-only">レシートを追加・確認</DialogTitle>
          <DialogDescription className="sr-only">
            レシートを撮影または画像から選択し、内容を確認して登録します
          </DialogDescription>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-0 md:grid-cols-[minmax(280px,36%)_1fr] md:grid-rows-1">
          <aside className="min-w-0 border-b bg-gray-50 p-4 md:border-b-0 md:border-r">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="h-12"
                disabled={isUploading}
                onClick={() => cameraInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-5 w-5" />
                )}
                {scans.length === 0 ? 'カメラで撮影' : '続けて撮影'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 bg-white"
                disabled={isUploading}
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 h-5 w-5" />
                画像を選択
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">未登録の下書き</span>
                <span className="text-gray-500">{scans.length}件</span>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : scans.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-gray-500">
                  撮影・選択したレシートはここに並びます
                </div>
              ) : (
                <ul className="max-h-[36vh] space-y-2 overflow-y-auto md:max-h-[calc(100dvh-190px)]">
                  {scans.map((scan, index) => (
                    <li key={scan.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-lg border bg-white p-2 text-left transition ${
                          scan.id === selectedScanId ? 'border-blue-500 ring-2 ring-blue-100' : ''
                        }`}
                        onClick={() => setSelectedScanId(scan.id)}
                      >
                        <ReceiptPreview scanId={scan.id} className="h-16 w-14 shrink-0 rounded" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">レシート {index + 1}</span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            {scan.status === 'processing' || scan.status === 'pending' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : scan.status === 'ready' ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            )}
                            {getStatusLabel(scan)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <main className="min-w-0 overflow-y-auto p-4 md:p-6">
            {!selectedScan ? (
              <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center text-gray-500">
                <Camera className="h-12 w-12 text-gray-300" />
                <p className="mt-4 font-medium">レシートを撮影または選択してください</p>
                <p className="mt-1 text-sm">複数枚を続けて追加できます</p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-5">
                <ReceiptPreview scanId={selectedScan.id} className="h-56 w-full rounded-lg border" />

                {!canReview ? (
                  <div className="rounded-lg border bg-white p-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                    <p className="mt-3 font-medium">レシートを解析しています</p>
                    <p className="mt-1 text-sm text-gray-500">待っている間に次の撮影ができます</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
                    {selectedScan.status === 'failed' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <p>{selectedScan.ocrError || 'OCR解析に失敗しました'}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => retryAnalysis(selectedScan.id)}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />再解析
                        </Button>
                      </div>
                    )}
                    {selectedScan.ocrResult?.warnings.map((warning) => (
                      <div key={warning} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        {warning}
                      </div>
                    ))}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="receipt-type">種別</Label>
                        <select
                          id="receipt-type"
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                          disabled={isRegistering}
                          {...register('type')}
                        >
                          <option value="expense">支出</option>
                          <option value="advance">立替</option>
                        </select>
                      </div>
                      <div
                        className={`space-y-2 rounded-md ${
                          fieldNeedsReview(selectedScan, 'amount') ? 'bg-amber-50 p-2' : ''
                        }`}
                      >
                        <Label htmlFor="receipt-amount">金額</Label>
                        <Input
                          id="receipt-amount"
                          type="number"
                          min={1}
                          disabled={isRegistering}
                          {...register('amount', { valueAsNumber: true })}
                        />
                        {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={`space-y-2 rounded-md ${fieldNeedsReview(selectedScan, 'occurredOn') ? 'bg-amber-50 p-2' : ''}`}>
                        <Label htmlFor="receipt-date">日付</Label>
                        <Input id="receipt-date" type="date" disabled={isRegistering} {...register('occurredOn')} />
                        {errors.occurredOn && <p className="text-sm text-red-500">{errors.occurredOn.message}</p>}
                      </div>
                      <div className={`space-y-2 rounded-md ${fieldNeedsReview(selectedScan, 'category') ? 'bg-amber-50 p-2' : ''}`}>
                        <Label htmlFor="receipt-category">カテゴリ</Label>
                        <select
                          id="receipt-category"
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                          disabled={isRegistering}
                          {...register('category')}
                        >
                          {categories.map((category) => (
                            <option key={category.key} value={category.key}>{category.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={`space-y-2 rounded-md ${fieldNeedsReview(selectedScan, 'place') ? 'bg-amber-50 p-2' : ''}`}>
                      <Label htmlFor="receipt-place">場所</Label>
                      <Input id="receipt-place" disabled={isRegistering} {...register('place')} />
                      {errors.place && <p className="text-sm text-red-500">{errors.place.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="receipt-payer">支払者</Label>
                      <select
                        id="receipt-payer"
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        disabled={isRegistering}
                        {...register('payerUserId')}
                      >
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {getMemberLabel(member)}{member.userId === currentUserId ? '（自分）' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {transactionType === 'advance' && (
                      <div className="space-y-2">
                        <Label htmlFor="receipt-advance-to">立替先</Label>
                        <Controller
                          name="advanceToUserId"
                          control={control}
                          render={({ field }) => (
                            <select
                              id="receipt-advance-to"
                              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                              disabled={isRegistering}
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(event.target.value || null)}
                            >
                              <option value="">家庭全体に立替</option>
                              {members.filter((member) => member.userId !== payerUserId).map((member) => (
                                <option key={member.userId} value={member.userId}>{getMemberLabel(member)}</option>
                              ))}
                            </select>
                          )}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="receipt-note">メモ</Label>
                      <textarea
                        id="receipt-note"
                        rows={2}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        disabled={isRegistering}
                        {...register('note')}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-600"
                        disabled={isRegistering}
                        onClick={() => void handleRemove(selectedScan)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />削除
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isRegistering}>
                        {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        確認して登録
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
