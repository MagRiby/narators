import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Not found');
    return r.json();
  });

/**
 * Fetch a narrator by ID.
 * Results are cached for 1 minute client-side via SWR deduping.
 * Multiple hovers on the same narrator share a single in-flight request.
 */
export function useNarrator(id: number | null) {
  return useSWR(id != null ? `/api/narrators/${id}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000,
    errorRetryCount: 1,
  });
}
