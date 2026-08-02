'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { createReceiptSignedUrl } from '@/services/receiptScans';

interface ReceiptPreviewProps {
  scanId: string;
  className?: string;
}

export function ReceiptPreview({ scanId, className = '' }: ReceiptPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    void createReceiptSignedUrl(scanId)
      .then((value) => {
        if (!cancelled) setUrl(value);
      })
      .catch(() => {
        if (!cancelled) setUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-gray-100 ${className}`}>
      {url === null ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="レシート下書き" className="h-full w-full object-contain" />
      ) : (
        <ImageIcon className="h-6 w-6 text-gray-400" />
      )}
    </div>
  );
}

