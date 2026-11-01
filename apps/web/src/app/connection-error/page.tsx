'use client';

import { LoadError } from '@/components/ui/LoadError';

export default function ConnectionErrorPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">ふたりの財布</h1>
      <LoadError
        title="サービスに接続できませんでした"
        onRetry={() => {
          // rewrite時は元のURLを再読込。直接開いた場合はホームへ戻る。
          if (window.location.pathname === '/connection-error') {
            window.location.assign('/');
          } else {
            window.location.reload();
          }
        }}
      />
    </main>
  );
}
