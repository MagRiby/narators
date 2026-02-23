import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Books' };

interface Book {
  id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  author_en?: string;
  hadith_count: number;
}

async function getBooks(): Promise<Book[]> {
  const res = await fetch(`${process.env.API_URL}/api/books`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export default async function BooksPage() {
  const books = await getBooks();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Hadith Collections</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.slug}`}
            className="
              block bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              rounded-xl p-5 hover:border-emerald-500
              hover:shadow-md transition-all group
            "
          >
            <p className="text-right text-xl font-arabic mb-1 text-gray-800 dark:text-gray-200" dir="rtl">
              {book.name_ar}
            </p>
            <h2 className="font-semibold text-lg group-hover:text-emerald-600 transition-colors">
              {book.name_en}
            </h2>
            {book.author_en && (
              <p className="text-sm text-gray-500 mt-0.5">{book.author_en}</p>
            )}
            <p className="text-sm text-emerald-600 font-medium mt-3">
              {book.hadith_count.toLocaleString()} hadiths →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
