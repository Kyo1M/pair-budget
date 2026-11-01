'use client';

import { Button } from '@/components/ui/button';

interface LoadErrorProps {
  title: string;
  onRetry: () => void;
}

export function LoadError({ title, onRetry }: LoadErrorProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-600">
        通信状況を確認して、もう一度お試しください。
      </p>
      <Button className="mt-4 min-h-11" onClick={onRetry}>再試行</Button>
    </div>
  );
}
