'use client';

import { useState, useCallback } from 'react';
import SearchBar from '@/components/search/SearchBar';
import SearchFilters from '@/components/search/SearchFilters';
import HadithList from '@/components/hadith/HadithList';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';

interface SearchState {
  q: string;
  book: string;
  grade: string;
  narrator: string;
  page: number;
}

const INITIAL: SearchState = { q: '', book: '', grade: '', narrator: '', page: 1 };

export default function SearchPage() {
  const [filters, setFilters]   = useState<SearchState>(INITIAL);
  const [results, setResults]   = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const doSearch = useCallback(async (state: SearchState) => {
    if (!state.q && !state.book && !state.grade && !state.narrator) return;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (state.q)        params.set('q', state.q);
    if (state.book)     params.set('book', state.book);
    if (state.grade)    params.set('grade', state.grade);
    if (state.narrator) params.set('narrator', state.narrator);
    params.set('page', String(state.page));

    try {
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error('Search failed');
      setResults(await res.json());
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (q: string) => {
    const next = { ...filters, q, page: 1 };
    setFilters(next);
    doSearch(next);
  };

  const handleFilterChange = (key: keyof SearchState, value: string) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    doSearch(next);
  };

  const handlePageChange = (page: number) => {
    const next = { ...filters, page };
    setFilters(next);
    doSearch(next);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Search Hadiths</h1>

      <SearchBar onSearch={handleSearch} />

      <SearchFilters
        book={filters.book}
        grade={filters.grade}
        onBookChange={(v) => handleFilterChange('book', v)}
        onGradeChange={(v) => handleFilterChange('grade', v)}
      />

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-center py-8">{error}</p>
      )}

      {!loading && results && (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {results.total !== undefined ? `${results.total} results` : `${results.data?.length} results`}
          </p>
          <HadithList hadiths={results.data ?? []} />
          {results.pages > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={results.pages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {!loading && !results && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Enter a search query above</p>
          <p className="text-sm">Search in Arabic or English · Filter by book, grade, or narrator</p>
        </div>
      )}
    </div>
  );
}
