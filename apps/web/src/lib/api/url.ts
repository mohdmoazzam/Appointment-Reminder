import { env } from '@/config/env';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** "/staff" + { page: 2 } → "/api/staff?page=2". Null and undefined params are left out. */
export function buildApiUrl(path: string, query?: QueryParams): string {
  const url = `${env.apiBaseUrl}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
