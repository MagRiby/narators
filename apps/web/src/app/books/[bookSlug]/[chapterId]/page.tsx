import type { Metadata } from 'next';
import Link from 'next/link';
import HadithList from '@/components/hadith/HadithList';
import Pagination from '@/components/ui/Pagination';

interface Props {
  params: { bookSlug: string; chapterId: string };
  searchParams: { page?: string };
}

async function getHadiths(slug: string, chapterId: string, page = '1') {
  const res = await fetch(
    `${process.env.API_URL}/api/books/${slug}/hadiths?chapter=${chapterId}&page=${page}&limit=20`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error('Failed to fetch hadiths');
  return res.json();
}

export const metadata: Metadata = { title: 'Hadiths' };

export default async function ChapterPage({ params, searchParams }: Props) {
  const page = searchParams.page ?? '1';
  const { data: hadiths, total, pages } = await getHadiths(
    params.bookSlug,
    params.chapterId,
    page
  );

  return (
    <div>
      <Link
        href={`/books/${params.bookSlug}`}
        className="text-sm text-emerald-600 hover:underline mb-4 inline-block"
      >
        ← Back to Chapters
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hadiths</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      <HadithList hadiths={hadiths} />

      <Pagination
        currentPage={parseInt(page)}
        totalPages={pages}
        baseHref={`/books/${params.bookSlug}/${params.chapterId}`}
      />
    </div>
  );
}
