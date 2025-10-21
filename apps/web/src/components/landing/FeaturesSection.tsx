export function FeaturesSection() {
  const features = [
    {
      emoji: '📊',
      title: 'かんたん支出管理',
      description:
        '食費、外食費など7つのカテゴリで自動集計。月次・年次のグラフでお金の流れが一目瞭然。',
    },
    {
      emoji: '💰',
      title: '立替精算を自動計算',
      description:
        '「家計の立替」も「個人の立替」も記録できる。誰がいくら立替えているか、残高が常に見える。',
    },
    {
      emoji: '🔐',
      title: 'ふたりだけの安心空間',
      description:
        '6桁の参加コードで簡単に招待。データは暗号化され、ふたりだけが見られます。',
    },
  ];

  return (
    <section id="features" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            PairBudgetの3つの特徴
          </h2>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-4xl">
                  {feature.emoji}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  {feature.description}
                </p>
                {/* スクリーンショット用のプレースホルダー */}
                <div className="mt-6 aspect-[4/3] overflow-hidden rounded-lg bg-gray-200">
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <span className="text-sm">画面イメージ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
