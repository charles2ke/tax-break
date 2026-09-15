import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError, httpRequestJson, redact, redactUrl } from '../src/services/http';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('redact', () => {
  it('replaces secret-looking values anywhere in the payload', () => {
    expect(
      redact({
        clientId: 'public-id',
        client_secret: 'super-secret',
        nested: { apiKey: 'abc', amount: 10 },
        list: [{ token: 't' }],
      }),
    ).toEqual({
      clientId: 'public-id',
      client_secret: '[redacted]',
      nested: { apiKey: '[redacted]', amount: 10 },
      list: [{ token: '[redacted]' }],
    });
  });

  it('strips query strings from URLs so tokens are never logged', () => {
    expect(redactUrl('https://example.test/api/itr?access_token=secret')).toBe(
      'https://example.test/api/itr',
    );
  });
});

describe('httpRequest', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns the parsed body on success', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ ok: true })) as unknown as typeof fetch;

    await expect(httpRequestJson('https://example.test/api', { retries: 0 })).resolves.toEqual({
      ok: true,
    });
  });

  it('retries transient failures and then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'busy' }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(httpRequestJson('https://example.test/api', { retries: 1 })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a client error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, 400));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(httpRequestJson('https://example.test/api', { retries: 2 })).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
