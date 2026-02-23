import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
          Hadith Explorer
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/books"
            className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition-colors"
          >
            Books
          </Link>
          <Link
            href="/narrators"
            className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition-colors"
          >
            Narrators
          </Link>
          <Link
            href="/search"
            className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition-colors"
          >
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
