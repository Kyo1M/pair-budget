import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/landing" className="text-2xl font-bold text-gray-900">
          PairBudget
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <a href="#features">機能</a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/auth">ログイン</Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/auth">無料で始める</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
