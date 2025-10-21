export function FAQSection() {
  const faqs = [
    {
      question: '無料で使えますか？',
      answer: 'はい、現在MVPとして無料でご利用いただけます。',
    },
    {
      question: 'データは安全ですか？',
      answer: 'Supabaseを使用し、データは暗号化されています。Row Level Securityにより、ふたりの世帯データは他のユーザーから完全に保護されています。',
    },
    {
      question: 'スマホアプリはありますか？',
      answer: '現在はWebアプリのみですが、スマホブラウザで快適に使えます。ホーム画面に追加することで、アプリのように利用できます。',
    },
    {
      question: '3人以上の世帯でも使えますか？',
      answer: 'MVP版は2人世帯向けに最適化されています。今後の機能拡張で対応を検討しています。',
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            よくある質問
          </h2>
        </div>
        <div className="mx-auto mt-16 max-w-3xl">
          <dl className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-lg bg-gray-50 p-6">
                <dt className="text-lg font-semibold text-gray-900">
                  Q. {faq.question}
                </dt>
                <dd className="mt-2 text-base text-gray-600">
                  A. {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
