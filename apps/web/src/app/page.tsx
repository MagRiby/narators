import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Hadith Explorer</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-1" dir="rtl" lang="ar">
          مستكشف الحديث النبوي
        </p>
        <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto mt-4">
          Browse thousands of hadiths across major collections. Hover narrator names for
          instant biographical cards, explore isnad chains, and search in Arabic or English.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/books"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
        >
          Browse Books
        </Link>
        <Link
          href="/search"
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:border-emerald-500 rounded-xl font-semibold transition-colors"
        >
          Search Hadiths
        </Link>
      </div>

      {/* Quick stats placeholder */}
      <div className="grid grid-cols-3 gap-6 mt-4 text-center">
        {[
          { label: 'Collections', value: '9' },
          { label: 'Hadiths', value: '60,000+' },
          { label: 'Narrators', value: '10,000+' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="text-3xl font-bold text-emerald-600">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
