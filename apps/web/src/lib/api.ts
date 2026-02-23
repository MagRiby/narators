/**
 * Typed API client (used in Server Components / API routes).
 * Client Components should use SWR hooks instead.
 */

const BASE = process.env.API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  books: {
    list:     ()                    => apiFetch<any[]>('/api/books'),
    get:      (slug: string)        => apiFetch<any>(`/api/books/${slug}`),
    chapters: (slug: string)        => apiFetch<any[]>(`/api/books/${slug}/chapters`),
    hadiths:  (slug: string, params: Record<string, string | number>) => {
      const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
      return apiFetch<any>(`/api/books/${slug}/hadiths?${qs}`);
    },
  },
  hadiths: {
    get: (id: number) => apiFetch<any>(`/api/hadiths/${id}`),
  },
  narrators: {
    list:    (params: Record<string, string | number> = {}) => {
      const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
      return apiFetch<any>(`/api/narrators?${qs}`);
    },
    get:     (id: number) => apiFetch<any>(`/api/narrators/${id}`),
    hadiths: (id: number, page = 1) => apiFetch<any>(`/api/narrators/${id}/hadiths?page=${page}`),
    graph:   (id: number) => apiFetch<any>(`/api/narrators/${id}/graph`),
  },
  search: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    return apiFetch<any>(`/api/search?${qs}`);
  },
};
