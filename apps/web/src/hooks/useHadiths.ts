import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UseHadithsOptions {
  bookSlug?: string;
  chapterId?: number;
  narratorId?: number;
  grade?: string;
  page?: number;
  limit?: number;
}

export function useHadiths({
  bookSlug,
  chapterId,
  narratorId,
  grade,
  page = 1,
  limit = 20,
}: UseHadithsOptions) {
  let url: string | null = null;

  if (bookSlug) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (chapterId) params.set('chapter', String(chapterId));
    if (grade)     params.set('grade', grade);
    url = `/api/books/${bookSlug}/hadiths?${params}`;
  } else if (narratorId) {
    url = `/api/narrators/${narratorId}/hadiths?page=${page}&limit=${limit}`;
  }

  return useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}
