import { expireSession, refreshSession } from '@/lib/auth/session';
import { tokenStore } from '@/lib/auth/token-store';
import { ApiError } from './api-error';
import { buildApiUrl, type QueryParams } from './url';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  /** Plain values are sent as JSON; FormData is sent as multipart/form-data. */
  body?: unknown;
  query?: QueryParams;
  /**
   * Send the access token, refreshing the session when it has expired. Defaults to true;
   * set to false for public endpoints such as login and signup.
   */
  authenticated?: boolean;
  signal?: AbortSignal;
}

/**
 * Calls the API and resolves with the parsed JSON body (undefined for 204 No Content).
 * Rejects with an ApiError for non-2xx responses and network failures.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authenticated = options.authenticated ?? true;
  const response = authenticated
    ? await sendAuthenticated(path, options)
    : await send(path, options, null);

  if (!response.ok) throw await ApiError.fromResponse(response);
  return readBody<T>(response);
}

type BodylessOptions = Omit<RequestOptions, 'method' | 'body'>;

/** Shorthands for apiRequest, one per HTTP method. */
export const http = {
  get: <T>(path: string, options?: BodylessOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: BodylessOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: BodylessOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: BodylessOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = void>(path: string, options?: BodylessOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

/**
 * Sends the request with the access token. If the API answers 401 the session is refreshed
 * once and the request retried; if that is not possible the session is expired, which signs
 * the user out.
 *
 * Exported for responses read as they arrive (event streams); everything else uses apiRequest.
 */
export async function sendAuthenticated(path: string, options: RequestOptions): Promise<Response> {
  if (!tokenStore.getAccessToken()) {
    // After a page reload only the refresh token is left (in storage).
    await refreshSession();
  }

  const tokenUsed = tokenStore.getAccessToken();
  if (!tokenUsed) {
    // refreshSession found no usable session and has already expired it.
    return new Response(null, { status: 401, statusText: 'Unauthorized' });
  }

  const response = await send(path, options, tokenUsed);
  if (response.status !== 401) return response;

  // Another request may have refreshed the token while this one was in flight; then retrying
  // with the new token is enough and saves a second refresh.
  const tokenChangedMeanwhile = tokenStore.getAccessToken() !== tokenUsed;
  const refreshed = tokenChangedMeanwhile || (await refreshSession());
  if (!refreshed) return response;

  const retried = await send(path, options, tokenStore.getAccessToken());
  if (retried.status === 401) expireSession();
  return retried;
}

async function send(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    // Leave Content-Type unset: the browser adds the multipart boundary.
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  try {
    return await fetch(buildApiUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    // Cancellation (e.g. TanStack Query aborting a stale request) is not a network failure.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw ApiError.network();
  }
}

async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (text === '') return undefined as T;
  return JSON.parse(text) as T;
}
