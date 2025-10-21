export function HowToUseSection() {
  const steps = [
    {
      number: '1',
      title: 'アカウント登録',
      description: 'メールアドレスとパスワードだけ',
    },
    {
      number: '2',
      title: '世帯を作成 or 参加',
      description: 'パートナーを6桁コードで招待',
    },
    {
      number: '3',
      title: '支出を記録',
      description: 'あとは日々の支出を入力するだけ',
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            3ステップで始められます
          </h2>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-8 lg:flex-row lg:gap-16"
              >
                <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-5xl font-bold text-white">
                  {step.number}
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-lg text-gray-600">
                    {step.description}
                  </p>
                </div>
                <div className="aspect-[3/2] w-full max-w-md overflow-hidden rounded-lg bg-gray-200 lg:w-80">
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <span className="text-sm">画面イメージ {step.number}</span>
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
