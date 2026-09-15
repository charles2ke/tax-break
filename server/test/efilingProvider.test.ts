import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EFilingError,
  EriEFilingProvider,
  MockEFilingProvider,
  getEFilingProvider,
  resetEFilingProviderForTests,
} from '../src/services/efilingProvider';

const originalFetch = globalThis.fetch;

/** Recorded shape of an ERI/GSP sandbox response; no live network call is made. */
const TOKEN_RESPONSE = { access_token: 'sandbox-token', expires_in: 3600 };
const SUBMIT_RESPONSE = {
  status: 'ACCEPTED',
  acknowledgementNumber: '123456789012345',
  submittedAt: '2026-07-20T09:15:00.000Z',
  message: 'Return accepted.',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function eriProvider(): EriEFilingProvider {
  return new EriEFilingProvider({
    baseUrl: 'https://eri.example.test',
    clientId: 'client',
    clientSecret: 'secret',
  });
}

describe('getEFilingProvider', () => {
  afterEach(() => {
    delete process.env.EFILING_PROVIDER;
    resetEFilingProviderForTests();
  });

  it('defaults to the simulated provider', () => {
    resetEFilingProviderForTests();
    const provider = getEFilingProvider();

    expect(provider).toBeInstanceOf(MockEFilingProvider);
    expect(provider.simulated).toBe(true);
  });

  it('requires ERI credentials when the real provider is selected', () => {
    process.env.EFILING_PROVIDER = 'eri';
    resetEFilingProviderForTests();

    expect(() => getEFilingProvider()).toThrow(EFilingError);
  });
});

describe('MockEFilingProvider', () => {
  it('labels its acknowledgement as simulated', async () => {
    const submission = await new MockEFilingProvider().fileReturn({
      userId: 1,
      taxReturnId: 7,
      assessmentYear: 'FY2025-26',
    });

    expect(submission.simulated).toBe(true);
    expect(submission.acknowledgementNumber).toMatch(/^MOCK-7-[0-9A-F]{8}$/);
    expect(submission.message).toContain('simulated');
  });
});

describe('EriEFilingProvider', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('exchanges credentials for a token and uploads the ITR JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(SUBMIT_RESPONSE));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const submission = await eriProvider().fileReturn({
      userId: 1,
      taxReturnId: 7,
      assessmentYear: 'FY2025-26',
      itrForm: 'ITR-1',
      itrJson: { ITR: { ITR1: {} } },
    });

    expect(submission).toMatchObject({
      status: 'accepted',
      acknowledgementNumber: '123456789012345',
      provider: 'eri',
      simulated: false,
    });

    const [tokenUrl] = fetchMock.mock.calls[0];
    const [submitUrl, submitInit] = fetchMock.mock.calls[1];
    expect(tokenUrl).toBe('https://eri.example.test/auth/token');
    expect(submitUrl).toBe('https://eri.example.test/itr/submit');
    expect(submitInit.headers.Authorization).toBe(['Bearer', TOKEN_RESPONSE.access_token].join(' '));
    expect(JSON.parse(submitInit.body)).toMatchObject({
      assessmentYear: 'FY2025-26',
      formType: 'ITR-1',
      clientReference: '7',
    });
  });

  it('reuses the access token across calls', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockImplementation(async () => jsonResponse(SUBMIT_RESPONSE));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = eriProvider();
    await provider.getStatus('123456789012345');
    await provider.getStatus('123456789012345');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refuses to file without the ITR JSON', async () => {
    await expect(
      eriProvider().fileReturn({ userId: 1, taxReturnId: 7, assessmentYear: 'FY2025-26' }),
    ).rejects.toBeInstanceOf(EFilingError);
  });

  it('does not leak the intermediary response body when it fails', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockImplementation(async () =>
        jsonResponse({ error: 'PAN ABCDE1234F is not registered' }, 400),
      ) as unknown as typeof fetch;

    await expect(
      eriProvider().fileReturn({
        userId: 1,
        taxReturnId: 7,
        assessmentYear: 'FY2025-26',
        itrJson: { ITR: {} },
      }),
    ).rejects.toThrow(/rejected the request \(HTTP 400\)/);
  });

  it('downloads the Form 26AS statement as text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(new Response('1^192^30-Apr-2024^F^15-May-2024^600000.00^48000.00'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const statement = await eriProvider().fetchForm26AS({
      userId: 1,
      assessmentYear: 'FY2025-26',
      pan: 'ABCDE1234F',
    });

    expect(statement).toContain('192');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://eri.example.test/ais/form26as?assessmentYear=FY2025-26&pan=ABCDE1234F',
    );
  });
});
