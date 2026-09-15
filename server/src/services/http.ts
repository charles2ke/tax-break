/**
 * Small wrapper around `fetch` for outbound calls to third-party services (e-filing
 * intermediaries, exchange-rate feeds, OAuth providers).
 *
 * Every outbound call gets a timeout, bounded retries with exponential backoff for transient
 * failures, and logging that never prints credentials: request headers and known secret-bearing
 * fields are redacted before anything reaches the log.
 */

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  /** JSON body; serialised and sent with `Content-Type: application/json`. */
  json?: unknown;
  /** Pre-serialised body, used for form-encoded requests. */
  body?: string;
  /** Milliseconds before the request is aborted. Defaults to `HTTP_TIMEOUT_MS` or 10s. */
  timeoutMs?: number;
  /** Number of retries for network errors and 5xx/429 responses. Defaults to 2. */
  retries?: number;
  /** Label used in logs instead of the full URL. */
  label?: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const SECRET_KEY_PATTERN =
  /(pass(word)?|secret|token|api[-_]?key|client[-_]?secret|authorization|refresh|assertion|otp|aadhaar|pan)/i;

function defaultTimeout(): number {
  const configured = Number(process.env.HTTP_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
}

/** Replaces the value of any secret-looking key with `[redacted]`, recursively. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redact(entry);
    }
    return result;
  }
  return value;
}

/** Strips the query string so access tokens passed as query parameters are never logged. */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '[invalid url]';
  }
}

function logWarning(label: string, message: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[integrations] ${label}: ${message}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs an HTTP request with a timeout and bounded retries.
 *
 * @throws {HttpError} when the service responds with a non-2xx status after all retries.
 */
export async function httpRequest(url: string, options: HttpRequestOptions = {}): Promise<Response> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? defaultTimeout();
  const label = options.label ?? redactUrl(url);
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  let body = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body,
        signal: controller.signal,
      });
      if (response.ok) return response;

      const text = await response.text().catch(() => '');
      if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
        logWarning(label, `responded ${response.status}, retrying (attempt ${attempt + 1})`);
        lastError = new HttpError(`${label} responded ${response.status}`, response.status, text);
      } else {
        throw new HttpError(`${label} responded ${response.status}`, response.status, text);
      }
    } catch (error) {
      if (error instanceof HttpError && !RETRYABLE_STATUSES.has(error.status)) throw error;
      lastError = error as Error;
      if (attempt >= retries) break;
      logWarning(label, `request failed (${(error as Error).name}), retrying`);
    } finally {
      clearTimeout(timer);
    }
    await delay(2 ** attempt * 250);
  }

  throw lastError ?? new Error(`${label} request failed`);
}

/** Performs an HTTP request and parses the JSON response body. */
export async function httpRequestJson<T>(
  url: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const response = await httpRequest(url, options);
  return (await response.json()) as T;
}

/** Performs an HTTP request and returns the response body as text. */
export async function httpRequestText(
  url: string,
  options: HttpRequestOptions = {},
): Promise<string> {
  const response = await httpRequest(url, options);
  return response.text();
}
