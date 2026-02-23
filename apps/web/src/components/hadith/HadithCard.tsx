'use client';

import NarratorSpan from './NarratorSpan';

export interface NarratorInHadith {
  id: number;
  name_ar: string;
  name_en?: string;
  kunya_en?: string;
  position: number;
}

export interface HadithData {
  id: number;
  number: number;
  number_in_book?: number;
  text_ar: string;
  text_en?: string;
  grade?: string;
  reference?: string;
  book: { slug: string; name_en: string; name_ar?: string };
  chapter?: { number: number; name_en?: string; name_ar?: string };
  narrators: { narrator: NarratorInHadith; position: number }[];
}

const GRADE_STYLES: Record<string, string> = {
  sahih:   'bg-green-100  text-green-800  dark:bg-green-900/30 dark:text-green-300',
  hasan:   'bg-blue-100   text-blue-800   dark:bg-blue-900/30  dark:text-blue-300',
  daif:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  mawdu:   'bg-red-100    text-red-800    dark:bg-red-900/30   dark:text-red-300',
  unknown: 'bg-gray-100   text-gray-600   dark:bg-gray-800     dark:text-gray-400',
};

/**
 * Walk the Arabic text and wrap each narrator's name_ar in a NarratorSpan.
 * Names that don't appear verbatim are skipped gracefully.
 */
// Arabic diacritics (tashkeel) range — these appear in DB text but not in narrator names
const DIACRITICS = '[\u064B-\u065F\u0670]*';

/**
 * Build a regex that matches a narrator name even when the source text has
 * diacritics between/after every letter. E.g. "عبد الله" matches "عَبْدَ اللَّهِ".
 */
function buildNameRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow diacritics after each character (including before spaces)
  const pattern = escaped.split('').join(DIACRITICS);
  return new RegExp(pattern);
}

function annotateArabicText(
  text: string,
  narrators: NarratorInHadith[]
): React.ReactNode[] {
  // Sort by position in chain so earlier names are matched first
  const sorted = [...narrators]
    .filter(n => n.name_ar)
    .sort((a, b) => a.position - b.position);

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  for (const n of sorted) {
    const regex = buildNameRegex(n.name_ar);
    const match = regex.exec(remaining);
    if (!match) continue;

    const idx = match.index;
    const matchedText = match[0]; // original text including diacritics

    if (idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    }
    parts.push(
      <NarratorSpan key={key++} narrator={n}>
        {matchedText}
      </NarratorSpan>
    );
    remaining = remaining.slice(idx + matchedText.length);
  }

  if (remaining) parts.push(<span key={key}>{remaining}</span>);
  return parts;
}

interface Props {
  hadith: HadithData;
  highlightQuery?: string;
}

export default function HadithCard({ hadith, highlightQuery }: Props) {
  const narrators = hadith.narrators.map((hn) => ({
    ...hn.narrator,
    position: hn.position,
  }));

  const annotated = annotateArabicText(hadith.text_ar, narrators);

  return (
    <article className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
      {/* Meta bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-mono">#{hadith.number_in_book ?? hadith.number}</span>
          <span>·</span>
          <span>{hadith.book.name_en}</span>
          {hadith.chapter?.name_en && (
            <>
              <span>·</span>
              <span>{hadith.chapter.name_en}</span>
            </>
          )}
          {narrators.length > 0 && (
            <>
              <span>·</span>
              <span>{narrators.length} narrator{narrators.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
        {hadith.grade && hadith.grade !== 'unknown' && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${GRADE_STYLES[hadith.grade] ?? GRADE_STYLES.unknown}`}
          >
            {hadith.grade}
          </span>
        )}
      </div>

      {/* Arabic text — narrator names are interactive */}
      <p
        className="text-right leading-loose text-lg font-arabic text-gray-900 dark:text-gray-100 mb-4"
        dir="rtl"
        lang="ar"
      >
        {annotated}
      </p>

      {/* English translation */}
      {hadith.text_en && (
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
          {hadith.text_en}
        </p>
      )}

      {/* Reference */}
      {hadith.reference && (
        <p className="text-xs text-gray-400 mt-2 text-right">{hadith.reference}</p>
      )}
    </article>
  );
}
