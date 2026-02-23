'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NarratorPopover from './NarratorPopover';

const RELIABILITY_BADGE: Record<string, string> = {
  thiqah: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  saduq:  'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300',
  daif:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  matruk: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
};

interface NarratorRow {
  id:           number;
  name_ar:      string;
  name_en:      string | null;
  kunya_en:     string | null;
  reliability:  string | null;
  generation:   string | null;
  death_year_h: number | null;
  _count:       { hadiths: number };
}

interface Props {
  narrators: NarratorRow[];
}

function NarratorRowItem({ narrator, rank }: { narrator: NarratorRow; rank: number }) {
  const router     = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ x: 0, y: 0 });
  const timerRef        = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = (e: React.MouseEvent<HTMLTableRowElement>) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.bottom + 4 });
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <>
      <tr
        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => router.push(`/narrators/${narrator.id}`)}
      >
        <td className="py-3 px-4 text-gray-400 text-sm tabular-nums w-12">{rank}</td>
        <td className="py-3 px-4">
          <p
            className="font-arabic text-lg text-right text-gray-900 dark:text-gray-100 leading-snug"
            dir="rtl"
            lang="ar"
          >
            {narrator.name_ar}
          </p>
          {(narrator.name_en || narrator.kunya_en) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {narrator.name_en ?? narrator.kunya_en}
            </p>
          )}
        </td>
        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
          {narrator.death_year_h ? `d. ${narrator.death_year_h} AH` : '—'}
        </td>
        <td className="py-3 px-4 hidden md:table-cell">
          {narrator.reliability ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${RELIABILITY_BADGE[narrator.reliability] ?? ''}`}>
              {narrator.reliability}
            </span>
          ) : '—'}
        </td>
        <td className="py-3 px-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums text-right">
          {narrator._count.hadiths.toLocaleString()}
        </td>
      </tr>

      {open && (
        <NarratorPopover
          narratorId={narrator.id}
          position={pos}
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default function NarratorsTable({ narrators }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <th className="py-3 px-4 w-12">#</th>
            <th className="py-3 px-4">Narrator</th>
            <th className="py-3 px-4 hidden sm:table-cell">Died</th>
            <th className="py-3 px-4 hidden md:table-cell">Grade</th>
            <th className="py-3 px-4 text-right">Hadiths</th>
          </tr>
        </thead>
        <tbody>
          {narrators.map((n, i) => (
            <NarratorRowItem key={n.id} narrator={n} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
