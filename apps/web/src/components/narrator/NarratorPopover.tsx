'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useNarrator } from '@/hooks/useNarrator';
import Spinner from '../ui/Spinner';

const RELIABILITY_BADGE: Record<string, string> = {
  thiqah: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  saduq:  'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300',
  daif:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  matruk: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
  unknown:'bg-gray-100  text-gray-600  dark:bg-gray-800     dark:text-gray-400',
};

interface Props {
  narratorId: number;
  position: { x: number; y: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function NarratorPopover({ narratorId, position, onMouseEnter, onMouseLeave }: Props) {
  const router = useRouter();
  const ref    = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNarrator(narratorId);

  // Flip horizontally if card would overflow viewport right edge
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth - 16) {
      ref.current.style.left = `${position.x - rect.width}px`;
    }
  }, [position.x, data]);

  const card = (
    <div
      ref={ref}
      style={{ top: position.y, left: position.x }}
      className="
        fixed z-50 w-80
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-2xl p-4 text-sm
        animate-in fade-in slide-in-from-top-1 duration-150
      "
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : data ? (
        <>
          {/* ── Header ─────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p
                className="font-bold text-right text-xl leading-snug font-arabic truncate"
                dir="rtl"
                lang="ar"
              >
                {data.kunya_ar ?? data.name_ar}
              </p>
              {data.kunya_en && (
                <p className="text-gray-500 text-xs">{data.kunya_en}</p>
              )}
              {data.name_en && (
                <p className="text-gray-700 dark:text-gray-300 text-sm">{data.name_en}</p>
              )}
            </div>
            {data.reliability && (
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${RELIABILITY_BADGE[data.reliability] ?? RELIABILITY_BADGE.unknown}`}
              >
                {data.reliability}
              </span>
            )}
          </div>

          {/* ── Dates & generation ─────────────────────── */}
          {(data.birth_year_h || data.death_year_h || data.generation) && (
            <p className="text-gray-500 text-xs mb-2 flex flex-wrap gap-1">
              {data.birth_year_h && <span>b. {data.birth_year_h} AH</span>}
              {data.birth_year_h && data.death_year_h && <span>·</span>}
              {data.death_year_h && <span>d. {data.death_year_h} AH</span>}
              {data.generation && <span>· {data.generation.replace('_', '-')}</span>}
              {data.region && <span>· {data.region}</span>}
            </p>
          )}

          {/* ── Biography snippet ──────────────────────── */}
          {data.biography && (
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-3 leading-relaxed">
              {data.biography}
            </p>
          )}

          {/* ── Teachers ───────────────────────────────── */}
          {data.as_student?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Teachers
              </p>
              <div className="flex flex-wrap gap-1">
                {data.as_student.slice(0, 5).map((r: any) => (
                  <span
                    key={r.teacher.id}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs"
                  >
                    {r.teacher.name_en ?? r.teacher.name_ar}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Students ───────────────────────────────── */}
          {data.as_teacher?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Students
              </p>
              <div className="flex flex-wrap gap-1">
                {data.as_teacher.slice(0, 5).map((r: any) => (
                  <span
                    key={r.student.id}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs"
                  >
                    {r.student.name_en ?? r.student.name_ar}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer CTA ─────────────────────────────── */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {data._count?.hadiths ?? 0} hadiths
            </span>
            <button
              onClick={() => router.push(`/narrators/${data.id}`)}
              className="
                text-xs bg-emerald-600 hover:bg-emerald-700
                text-white px-3 py-1.5 rounded-lg
                font-medium transition-colors
              "
            >
              View All Hadiths →
            </button>
          </div>
        </>
      ) : (
        <p className="text-red-400 text-xs text-center py-4">
          Failed to load narrator data.
        </p>
      )}
    </div>
  );

  // Render into document.body so z-index stacking is unaffected by parents
  if (typeof document === 'undefined') return null;
  return createPortal(card, document.body);
}
