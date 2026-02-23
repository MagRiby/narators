'use client';

interface Props {
  currentPage: number;
  totalPages: number;
  /** For server-rendered pages: provide baseHref and page numbers become links. */
  baseHref?: string;
  /** For client-rendered pages: provide a callback instead. */
  onPageChange?: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, baseHref, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);

  const handleClick = (page: number) => {
    if (onPageChange) onPageChange(page);
  };

  const renderPage = (page: number | '…') => {
    if (page === '…') {
      return (
        <span key={Math.random()} className="px-3 py-1.5 text-gray-400 select-none">
          …
        </span>
      );
    }

    const isActive = page === currentPage;
    const classes = `
      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
      ${isActive
        ? 'bg-emerald-600 text-white'
        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-500'}
    `;

    if (baseHref) {
      return (
        <a key={page} href={`${baseHref}?page=${page}`} className={classes}>
          {page}
        </a>
      );
    }

    return (
      <button key={page} onClick={() => handleClick(page)} className={classes} disabled={isActive}>
        {page}
      </button>
    );
  };

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;
  const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 transition-colors';

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
      {baseHref ? (
        <a
          href={prevDisabled ? '#' : `${baseHref}?page=${currentPage - 1}`}
          className={`${btnBase} ${prevDisabled ? 'opacity-40 cursor-default' : 'hover:border-emerald-500'}`}
        >
          ← Prev
        </a>
      ) : (
        <button
          disabled={prevDisabled}
          onClick={() => handleClick(currentPage - 1)}
          className={`${btnBase} ${prevDisabled ? 'opacity-40' : 'hover:border-emerald-500'}`}
        >
          ← Prev
        </button>
      )}

      {pages.map(renderPage)}

      {baseHref ? (
        <a
          href={nextDisabled ? '#' : `${baseHref}?page=${currentPage + 1}`}
          className={`${btnBase} ${nextDisabled ? 'opacity-40 cursor-default' : 'hover:border-emerald-500'}`}
        >
          Next →
        </a>
      ) : (
        <button
          disabled={nextDisabled}
          onClick={() => handleClick(currentPage + 1)}
          className={`${btnBase} ${nextDisabled ? 'opacity-40' : 'hover:border-emerald-500'}`}
        >
          Next →
        </button>
      )}
    </div>
  );
}

function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];
  if (current > 3)  pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}
