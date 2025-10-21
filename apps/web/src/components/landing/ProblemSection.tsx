export function ProblemSection() {
  const problems = [
    {
      emoji: '😓',
      text: 'あれ、この前の立替いくらだっけ？',
    },
    {
      emoji: '😓',
      text: '家賃は私が払ったから、今月は...',
    },
    {
      emoji: '😓',
      text: 'レシート撮るの面倒で続かない',
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            こんな悩み、ありませんか？
          </h2>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {problems.map((problem, index) => (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center"
              >
                <div className="text-5xl">{problem.emoji}</div>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  {problem.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-lg font-semibold text-blue-600">
              → PairBudgetなら、スマホでサッと記録・自動計算
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
