'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import HadithList from '../hadith/HadithList';
import Pagination from '../ui/Pagination';
import Spinner from '../ui/Spinner';

// Lazy-load the graph (heavy — only loaded on narrator profile page)
const NarratorGraph = dynamic(() => import('./NarratorGraph'), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center text-gray-400">Loading graph…</div>,
});

const RELIABILITY_BADGE: Record<string, string> = {
  thiqah: 'bg-green-100 text-green-800',
  saduq:  'bg-blue-100  text-blue-800',
  daif:   'bg-yellow-100 text-yellow-800',
  matruk: 'bg-red-100   text-red-800',
  unknown:'bg-gray-100  text-gray-600',
};

interface Props {
  narrator: any;
}

export default function NarratorProfile({ narrator }: Props) {
  const [hadiths,   setHadiths]   = useState<any>(null);
  const [page,      setPage]       = useState(1);
  const [loading,   setLoading]    = useState(false);
  const [showGraph, setShowGraph]  = useState(false);

  async function loadHadiths(p: number) {
    setLoading(true);
    const res = await fetch(`/api/narrators/${narrator.id}/hadiths?page=${p}&limit=20`);
    const data = await res.json();
    setHadiths(data);
    setLoading(false);
  }

  const handleLoadHadiths = () => {
    if (!hadiths) loadHadiths(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadHadiths(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Bio card ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">{narrator.name_en ?? narrator.name_ar}</h1>
            <p className="text-2xl font-arabic text-gray-500 mt-1" dir="rtl" lang="ar">
              {narrator.kunya_ar ?? narrator.name_ar}
            </p>
          </div>
          {narrator.reliability && (
            <span
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-semibold capitalize ${RELIABILITY_BADGE[narrator.reliability] ?? RELIABILITY_BADGE.unknown}`}
            >
              {narrator.reliability}
            </span>
          )}
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
          {narrator.kunya_en && (
            <div>
              <dt className="text-xs text-gray-400 uppercase">Kunya</dt>
              <dd>{narrator.kunya_en}</dd>
            </div>
          )}
          {narrator.generation && (
            <div>
              <dt className="text-xs text-gray-400 uppercase">Generation</dt>
              <dd className="capitalize">{narrator.generation.replace('_', '-')}</dd>
            </div>
          )}
          {narrator.region && (
            <div>
              <dt className="text-xs text-gray-400 uppercase">Region</dt>
              <dd>{narrator.region}</dd>
            </div>
          )}
          {narrator.birth_year_h && (
            <div>
              <dt className="text-xs text-gray-400 uppercase">Born</dt>
              <dd>{narrator.birth_year_h} AH{narrator.birth_year_ce ? ` (${narrator.birth_year_ce} CE)` : ''}</dd>
            </div>
          )}
          {narrator.death_year_h && (
            <div>
              <dt className="text-xs text-gray-400 uppercase">Died</dt>
              <dd>{narrator.death_year_h} AH{narrator.death_year_ce ? ` (${narrator.death_year_ce} CE)` : ''}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-400 uppercase">Hadiths</dt>
            <dd>{narrator._count?.hadiths ?? 0}</dd>
          </div>
        </dl>

        {/* Biography */}
        {narrator.biography && (
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {narrator.biography}
          </p>
        )}

        {/* Teachers & Students */}
        {narrator.as_student?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Teachers</h3>
            <div className="flex flex-wrap gap-2">
              {narrator.as_student.map((r: any) => (
                <a
                  key={r.teacher.id}
                  href={`/narrators/${r.teacher.id}`}
                  className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg text-sm hover:underline"
                >
                  {r.teacher.name_en ?? r.teacher.name_ar}
                </a>
              ))}
            </div>
          </div>
        )}

        {narrator.as_teacher?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Students</h3>
            <div className="flex flex-wrap gap-2">
              {narrator.as_teacher.map((r: any) => (
                <a
                  key={r.student.id}
                  href={`/narrators/${r.student.id}`}
                  className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg text-sm hover:underline"
                >
                  {r.student.name_en ?? r.student.name_ar}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Isnad graph ───────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={() => setShowGraph((v) => !v)}
          className="mb-3 text-sm font-semibold text-emerald-600 hover:underline"
        >
          {showGraph ? '▼ Hide' : '▶ Show'} Teacher–Student Graph
        </button>
        {showGraph && <NarratorGraph narratorId={narrator.id} />}
      </div>

      {/* ── Hadiths ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Transmitted Hadiths</h2>
          {!hadiths && (
            <button
              onClick={handleLoadHadiths}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Load Hadiths
            </button>
          )}
        </div>

        {loading && <div className="flex justify-center py-10"><Spinner /></div>}

        {hadiths && !loading && (
          <>
            <HadithList hadiths={hadiths.data} />
            <Pagination
              currentPage={page}
              totalPages={hadiths.pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
