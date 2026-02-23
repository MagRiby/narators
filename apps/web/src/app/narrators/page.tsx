import { api } from '@/lib/api';
import Link from 'next/link';
import NarratorsTable from '@/components/narrator/NarratorsTable';

export const metadata = { title: 'Narrators' };

const LIMIT = 50;

interface Props {
  searchParams: { page?: string; search?: string };
}

export default async function NarratorsPage({ searchParams }: Props) {
  const page   = Math.max(1, parseInt(searchParams.page ?? '1'));
  const search = searchParams.search ?? '';

  const params: Record<string, string | number> = { page, limit: LIMIT };
  if (search) params.search = search;

  const { data: narrators, total, pages } = await api.narrators.list(params);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Narrators</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total.toLocaleString()} narrators · sorted by hadith count · hover for bio
          </p>
        </div>

        {/* Search */}
        <form method="get" className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name…"
            className="
              px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-emerald-500
              w-52
            "
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Search
          </button>
          {search && (
            <Link
              href="/narrators"
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <NarratorsTable narrators={narrators} />

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          {page > 1 && (
            <Link
              href={`/narrators?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/narrators?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
