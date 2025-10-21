import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            ふたりのお金、
            <br />
            もっとシンプルに
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            カップルのための家計管理アプリ。
            <br />
            支出の記録から立替の精算まで、ふたりのお財布をひとつに。
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth">無料で始める</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">使い方を見る</a>
            </Button>
          </div>
        </div>
        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100">
              {/* ここにアプリのスクリーンショットやモックアップ画像を配置 */}
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl">📱</div>
                  <p className="mt-2 text-sm">ダッシュボード画面</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
