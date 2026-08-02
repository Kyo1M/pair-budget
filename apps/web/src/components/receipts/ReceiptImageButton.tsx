'use client';

import { useEffect, useState } from 'react';
import { Loader2, ReceiptText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createReceiptSignedUrl } from '@/services/receiptScans';

interface ReceiptImageButtonProps {
  scanId: string;
  compact?: boolean;
}

export function ReceiptImageButton({ scanId, compact = false }: ReceiptImageButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setError(null);
    void createReceiptSignedUrl(scanId)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : '画像を取得できませんでした');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, scanId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
          aria-label="レシート画像を見る"
          onClick={(event) => event.stopPropagation()}
        >
          <ReceiptText className="h-4 w-4" />
          {!compact && <span>レシート</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>レシート画像</DialogTitle>
          <DialogDescription>登録時に保存した元画像です</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-48 items-center justify-center rounded-lg bg-gray-50 p-2">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="保存されたレシート" className="max-h-[70vh] max-w-full object-contain" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

