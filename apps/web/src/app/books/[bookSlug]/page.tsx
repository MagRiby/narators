import type { Metadata } from 'next';
import Link from 'next/link';

interface Props {
  params: { bookSlug: string };
}

interface Chapter {
  id: number;
  number: number;
  name_ar: string;
  name_en?: string;
  hadith_count: number;
}

interface Book {
  id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  author_en?: string;
  hadith_count: number;
  chapters: Chapter[];
}

async function getBook(slug: string): Promise<Book> {
  const res = await fetch(`${process.env.API_URL}/api/books/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Book not found');
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = await getBook(params.bookSlug);
  return { title: book.name_en };
}

export default async function BookPage({ params }: Props) {
  const book = await getBook(params.bookSlug);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/books" className="text-sm text-emerald-600 hover:underline mb-2 inline-block">
          ← All Books
        </Link>
        <h1 className="text-3xl font-bold">{book.name_en}</h1>
        <p className="text-right text-2xl font-arabic text-gray-600 dark:text-gray-300 mt-1" dir="rtl">
          {book.name_ar}
        </p>
        {book.author_en && (
          <p className="text-gray-500 mt-1">{book.author_en}</p>
        )}
        <p className="text-sm text-gray-400 mt-2">{book.hadith_count.toLocaleString()} hadiths</p>
      </div>

      {/* Chapter list */}
      <h2 className="text-xl font-semibold mb-4">Chapters</h2>
      <div className="space-y-2">
        {book.chapters.map((chapter) => (
          <Link
            key={chapter.id}
            href={`/books/${book.slug}/${chapter.id}`}
            className="
              flex items-center justify-between
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              rounded-lg px-4 py-3
              hover:border-emerald-500 hover:shadow-sm
              transition-all group
            "
          >
            <div>
              <span className="text-xs text-gray-400 mr-2">#{chapter.number}</span>
              <span className="font-medium group-hover:text-emerald-600 transition-colors">
                {chapter.name_en ?? chapter.name_ar}
              </span>
              {chapter.name_en && (
                <span className="ml-3 text-sm text-gray-500 font-arabic" dir="rtl">
                  {chapter.name_ar}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {chapter.hadith_count} hadiths
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
