import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-white">PairBudget</p>
            <p className="mt-2 text-sm text-gray-400">
              ふたりの財布を、ひとつに
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm">
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors"
            >
              利用規約
            </Link>
            <Link
              href="/contact"
              className="text-gray-400 hover:text-white transition-colors"
            >
              お問い合わせ
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} PairBudget. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
