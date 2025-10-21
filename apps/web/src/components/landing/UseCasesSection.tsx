import { Card, CardContent } from '@/components/ui/card';

export function UseCasesSection() {
  const useCases = [
    {
      title: '同棲カップル',
      description: '家賃と光熱費を分担。立替の精算忘れがゼロに',
      icon: '🏠',
    },
    {
      title: '共働き夫婦',
      description: '食費担当が月ごとに交代。月末の集計が楽',
      icon: '👫',
    },
    {
      title: '新婚',
      description: 'お互いの支出を見える化して、将来の貯金計画を立てる',
      icon: '💍',
    },
  ];

  return (
    <section className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            こんなシーンで使えます
          </h2>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-2 hover:border-blue-300 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl">{useCase.icon}</div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-base text-gray-600">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
