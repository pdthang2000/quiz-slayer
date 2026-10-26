import { config } from '../config';

/**
 * A failed API call. `code` is the server's error code (card-library.md → Error handling),
 * e.g. "CardChanged", or a technical one: "Network" (no answer within REQUEST_TIMEOUT_MS),
 * "Http<status>" (a non-domain error such as a 400 from request validation, or a body that is
 * not JSON, e.g. a proxy's HTML 502).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: Record<string, unknown>,
  ) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | string[] | undefined>;

export type RequestOptions = {
  query?: Query;
  body?: unknown;
  /** CONFLICT-01: the version the screen showed, sent as If-Match. */
  version?: number;
};

/** A request with no answer after this long counts as "no network". */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Domain error codes are single PascalCase words; Nest's own errors use phrases ("Bad Request"). */
const DOMAIN_CODE = /^[A-Z][A-Za-z]+$/;

export function toQueryString(query: Query | undefined): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.version !== undefined) headers['If-Match'] = `"${options.version}"`;

  // AbortController + setTimeout rather than AbortSignal.timeout, which React Native lacks.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  let text: string;
  try {
    response = await fetch(
      `${config.apiUrl}${path}${toQueryString(options.query)}`,
      {
        method,
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      },
    );
    text = await response.text();
  } catch {
    throw new ApiError(0, 'Network', {});
  } finally {
    clearTimeout(timer);
  }

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(response.status, `Http${response.status}`, {});
  }
  if (!response.ok) {
    const data = (body ?? {}) as Record<string, unknown>;
    const code =
      typeof data.error === 'string' && DOMAIN_CODE.test(data.error)
        ? data.error
        : `Http${response.status}`;
    throw new ApiError(response.status, code, data);
  }
  return body as T;
}
