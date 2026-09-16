import crypto from 'crypto';
import { HttpError, httpRequestJson, httpRequestText } from './http';

export interface EFilingSubmission {
  status: 'submitted' | 'accepted' | 'rejected' | 'pending';
  acknowledgementNumber: string;
  submittedAt: string;
  message: string;
  /** Identifier of the provider that handled the submission (`mock` or `eri`). */
  provider: string;
  /** True when the acknowledgement is simulated and was never sent to the tax department. */
  simulated: boolean;
}

export interface EFilingRequest {
  userId: number;
  taxReturnId: number;
  assessmentYear: string;
  /** Recommended ITR form, e.g. `ITR-1`. */
  itrForm?: string;
  /** Return document in the Income Tax Department's ITR JSON format. */
  itrJson?: Record<string, unknown>;
}

export interface EFilingProvider {
  /** Provider identifier used in API responses and logs. */
  readonly name: string;
  /** Whether submissions are simulated rather than really filed. */
  readonly simulated: boolean;
  /** Submits a return for e-filing and returns an acknowledgement. */
  fileReturn(payload: EFilingRequest): Promise<EFilingSubmission>;
  /** Fetches the latest status of a previously submitted return. */
  getStatus(acknowledgementNumber: string): Promise<EFilingSubmission>;
  /**
   * Downloads the taxpayer's Form 26AS / AIS statement for an assessment year as text, in the
   * same format TRACES exports, so it can be parsed with `parseForm26AS`.
   */
  fetchForm26AS?(payload: { userId: number; assessmentYear: string; pan: string }): Promise<string>;
}

export class EFilingError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'EFilingError';
    this.status = status;
  }
}

/**
 * Mock e-filing provider. Real integration with the Income Tax Department's e-filing portal (or
 * a licensed ERI/GSP intermediary) requires registration, credentials, and compliance review
 * that cannot be completed purely through code changes. This mock simulates a successful
 * submission so the rest of the product (UI, persistence, status tracking) can be built and
 * tested end-to-end, and is swapped for {@link EriEFilingProvider} once API access is available.
 */
export class MockEFilingProvider implements EFilingProvider {
  readonly name = 'mock';
  readonly simulated = true;

  private readonly disclaimer =
    'This is a simulated e-filing submission for demonstration purposes only. It has not ' +
    'been sent to the Income Tax Department. Real e-filing requires an authorized ERI/GSP ' +
    'integration.';

  async fileReturn(payload: EFilingRequest): Promise<EFilingSubmission> {
    const acknowledgementNumber = `MOCK-${payload.taxReturnId}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
    return {
      status: 'submitted',
      acknowledgementNumber,
      submittedAt: new Date().toISOString(),
      message: this.disclaimer,
      provider: this.name,
      simulated: true,
    };
  }

  async getStatus(acknowledgementNumber: string): Promise<EFilingSubmission> {
    return {
      status: 'submitted',
      acknowledgementNumber,
      submittedAt: new Date().toISOString(),
      message: this.disclaimer,
      provider: this.name,
      simulated: true,
    };
  }
}

interface EriConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** ERI registration number allotted by the Income Tax Department. */
  eriId?: string;
}

interface EriTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface EriSubmissionResponse {
  status?: string;
  acknowledgementNumber?: string;
  ackNumber?: string;
  submittedAt?: string;
  message?: string;
}

function readEriConfig(): EriConfig {
  const baseUrl = process.env.ERI_API_BASE_URL;
  const clientId = process.env.ERI_CLIENT_ID;
  const clientSecret = process.env.ERI_CLIENT_SECRET;
  if (!baseUrl || !clientId || !clientSecret) {
    throw new EFilingError(
      'EFILING_PROVIDER=eri requires ERI_API_BASE_URL, ERI_CLIENT_ID and ERI_CLIENT_SECRET.',
      500,
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), clientId, clientSecret, eriId: process.env.ERI_ID };
}

function normaliseStatus(status: string | undefined): EFilingSubmission['status'] {
  const value = (status ?? '').toLowerCase();
  if (value.includes('accept') || value.includes('success')) return 'accepted';
  if (value.includes('reject') || value.includes('fail')) return 'rejected';
  if (value.includes('pending') || value.includes('progress')) return 'pending';
  return 'submitted';
}

function toEFilingError(error: unknown): EFilingError {
  if (error instanceof EFilingError) return error;
  if (error instanceof HttpError) {
    // The intermediary's response body can echo back taxpayer data, so it is not surfaced.
    return new EFilingError(
      `The e-filing intermediary rejected the request (HTTP ${error.status}).`,
      error.status >= 400 && error.status < 500 ? 400 : 502,
    );
  }
  return new EFilingError('The e-filing intermediary could not be reached.');
}

/**
 * Real e-filing through a licensed ERI/GSP intermediary.
 *
 * Intermediaries expose the same shape of REST API: an OAuth2 client-credentials token endpoint,
 * an upload endpoint that takes the ITR JSON, a status endpoint keyed by acknowledgement number,
 * and (usually) a Form 26AS/AIS download. Endpoint paths are configurable so a specific
 * provider's routes can be pointed at without a code change, and no credential is ever logged.
 */
export class EriEFilingProvider implements EFilingProvider {
  readonly name = 'eri';
  readonly simulated = false;

  private token?: { value: string; expiresAt: number };

  constructor(private readonly config: EriConfig = readEriConfig()) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    }).toString();

    const response = await httpRequestJson<EriTokenResponse>(
      `${this.config.baseUrl}${process.env.ERI_TOKEN_PATH ?? '/auth/token'}`,
      {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        label: 'eri token endpoint',
      },
    );
    if (!response.access_token) {
      throw new EFilingError('The e-filing intermediary did not return an access token.');
    }
    this.token = {
      value: response.access_token,
      expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
    };
    return this.token.value;
  }

  private async authorizedHeaders(): Promise<Record<string, string>> {
    const token = await this.accessToken();
    const headers: Record<string, string> = { Authorization: ['Bearer', token].join(' ') };
    if (this.config.eriId) headers['X-ERI-Id'] = this.config.eriId;
    return headers;
  }

  async fileReturn(payload: EFilingRequest): Promise<EFilingSubmission> {
    if (!payload.itrJson) {
      throw new EFilingError(
        'Filing through an ERI requires the taxpayer details (PAN, name, date of birth) so the ' +
          'ITR JSON can be generated.',
        400,
      );
    }
    try {
      const response = await httpRequestJson<EriSubmissionResponse>(
        `${this.config.baseUrl}${process.env.ERI_SUBMIT_PATH ?? '/itr/submit'}`,
        {
          method: 'POST',
          headers: await this.authorizedHeaders(),
          json: {
            assessmentYear: payload.assessmentYear,
            formType: payload.itrForm,
            itr: payload.itrJson,
            clientReference: String(payload.taxReturnId),
          },
          // Filing submission is not idempotent: if the intermediary accepts it but the
          // response is lost, a retry could file the same return twice. Fail fast instead.
          retries: 0,
          label: 'eri submit endpoint',
        },
      );
      const acknowledgementNumber = response.acknowledgementNumber ?? response.ackNumber;
      if (!acknowledgementNumber) {
        throw new EFilingError('The e-filing intermediary did not return an acknowledgement.');
      }
      return {
        status: normaliseStatus(response.status),
        acknowledgementNumber,
        submittedAt: response.submittedAt ?? new Date().toISOString(),
        message: response.message ?? 'Return submitted through the e-filing intermediary.',
        provider: this.name,
        simulated: false,
      };
    } catch (error) {
      throw toEFilingError(error);
    }
  }

  async getStatus(acknowledgementNumber: string): Promise<EFilingSubmission> {
    try {
      const statusPath = process.env.ERI_STATUS_PATH ?? '/itr/status';
      const response = await httpRequestJson<EriSubmissionResponse>(
        `${this.config.baseUrl}${statusPath}/${encodeURIComponent(acknowledgementNumber)}`,
        { headers: await this.authorizedHeaders(), label: 'eri status endpoint' },
      );
      return {
        status: normaliseStatus(response.status),
        acknowledgementNumber,
        submittedAt: response.submittedAt ?? new Date().toISOString(),
        message: response.message ?? 'Status fetched from the e-filing intermediary.',
        provider: this.name,
        simulated: false,
      };
    } catch (error) {
      throw toEFilingError(error);
    }
  }

  async fetchForm26AS(payload: {
    userId: number;
    assessmentYear: string;
    pan: string;
  }): Promise<string> {
    try {
      const path = process.env.ERI_FORM26AS_PATH ?? '/ais/form26as';
      const query = new URLSearchParams({
        assessmentYear: payload.assessmentYear,
        pan: payload.pan,
      }).toString();
      return await httpRequestText(`${this.config.baseUrl}${path}?${query}`, {
        headers: { ...(await this.authorizedHeaders()), Accept: 'text/plain' },
        label: 'eri form 26AS endpoint',
      });
    } catch (error) {
      throw toEFilingError(error);
    }
  }
}

export type EFilingProviderName = 'mock' | 'eri';

function isEFilingProviderName(name: string): name is EFilingProviderName {
  return name === 'mock' || name === 'eri';
}

function createProvider(name: EFilingProviderName): EFilingProvider {
  return name === 'eri' ? new EriEFilingProvider() : new MockEFilingProvider();
}

const providersByName = new Map<EFilingProviderName, EFilingProvider>();

function getOrCreateProvider(name: EFilingProviderName): EFilingProvider {
  let provider = providersByName.get(name);
  if (!provider) {
    provider = createProvider(name);
    providersByName.set(name, provider);
  }
  return provider;
}

/**
 * Returns the configured e-filing provider. `EFILING_PROVIDER=eri` selects the real ERI/GSP
 * integration; anything else (the default) keeps the simulated provider so the demo, tests and
 * CI never need credentials.
 */
export function getEFilingProvider(): EFilingProvider {
  const envValue = process.env.EFILING_PROVIDER ?? 'mock';
  const key: EFilingProviderName = isEFilingProviderName(envValue) ? envValue : 'mock';
  return getOrCreateProvider(key);
}

/**
 * Resolves the provider that accepted a specific submission, by name, regardless of which
 * provider is currently selected by the environment. Used when refreshing the status of a saved
 * return so a configuration/deployment change never queries the wrong provider.
 */
export function getEFilingProviderByName(name: string): EFilingProvider {
  if (!isEFilingProviderName(name)) {
    throw new EFilingError(`Unknown e-filing provider "${name}".`, 500);
  }
  return getOrCreateProvider(name);
}

/** Test helper: clears the memoised provider so a changed environment is picked up. */
export function resetEFilingProviderForTests(): void {
  providersByName.clear();
}
