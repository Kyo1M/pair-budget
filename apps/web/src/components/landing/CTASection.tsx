import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="bg-blue-600 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            ふたりの家計管理、
            <br />
            今日から始めませんか？
          </h2>
          <p className="mt-6 text-lg leading-8 text-blue-100">
            クレジットカード不要・3分で登録完了
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/auth">無料で始める</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
