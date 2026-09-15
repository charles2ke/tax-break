import type {
  AdvanceTaxResult,
  Form26ASSummary,
  AssessmentYear,
  InternationalTaxCalculationInput,
  InternationalTaxResult,
  ItrRecommendation,
  ItrRecommenderInput,
  RegimeComparisonResult,
  TaxCalculationInput,
} from '@tax-break/tax-engine';
import { calculateInternationalTax, compareRegimes } from '@tax-break/tax-engine';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error ?? 'Request failed', response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const CSRF_COOKIE_NAME = 'tax_break_csrf';

function readCookie(name: string): string | undefined {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
}

function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }
  return fetch(path, {
    credentials: 'include',
    ...init,
    headers: { ...headers, ...init?.headers },
  }).then(parseJsonOrThrow<T>);
}

function calculateLocally(
  input: TaxCalculationInput | InternationalTaxCalculationInput,
): RegimeComparisonResult | InternationalTaxResult {
  return 'country' in input ? calculateInternationalTax(input) : compareRegimes(input);
}

export async function calculateTax(
  input: TaxCalculationInput | InternationalTaxCalculationInput,
): Promise<RegimeComparisonResult | InternationalTaxResult> {
  if (import.meta.env.VITE_CALCULATION_MODE === 'local') {
    return calculateLocally(input);
  }

  try {
    return await request<RegimeComparisonResult | InternationalTaxResult>('/api/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 404) {
      // Network error (e.g. offline or static hosting without a backend) or a
      // missing /api/calculate route both fall back to local calculation.
      return calculateLocally(input);
    }
    throw error;
  }
}

export async function calculateAdvanceTax(
  totalTaxLiability: number,
  taxAlreadyPaid: number,
  assessmentYear: AssessmentYear,
): Promise<AdvanceTaxResult> {
  return request('/api/advance-tax', {
    method: 'POST',
    body: JSON.stringify({ totalTaxLiability, taxAlreadyPaid, assessmentYear }),
  });
}

export async function getItrRecommendation(
  input: ItrRecommenderInput,
): Promise<ItrRecommendation> {
  return request('/api/itr-recommendation', { method: 'POST', body: JSON.stringify(input) });
}

// --- Auth ---

export interface AuthUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

export async function signup(email: string, password: string): Promise<AuthUser> {
  const { user } = await request<{ user: AuthUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { user } = await request<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return user;
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<AuthUser | undefined> {
  try {
    const { user } = await request<{ user: AuthUser }>('/api/auth/me');
    return user;
  } catch {
    return undefined;
  }
}

// --- Saved tax returns ---

export interface SavedTaxReturn {
  id: number;
  assessmentYear: string;
  label: string | null;
  input: TaxCalculationInput;
  result: RegimeComparisonResult;
  efilingStatus: string | null;
  efilingAckNumber: string | null;
  efilingProvider?: string | null;
  efilingCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function saveTaxReturn(
  assessmentYear: string,
  label: string | undefined,
  input: TaxCalculationInput,
  result: RegimeComparisonResult,
): Promise<SavedTaxReturn> {
  return request('/api/tax-returns', {
    method: 'POST',
    body: JSON.stringify({ assessmentYear, label, input, result }),
  });
}

export async function listSavedTaxReturns(): Promise<SavedTaxReturn[]> {
  return request('/api/tax-returns');
}

export async function deleteSavedTaxReturn(id: number): Promise<void> {
  await request(`/api/tax-returns/${id}`, { method: 'DELETE' });
}

export function exportPdfUrl(id: number): string {
  return `/api/tax-returns/${id}/export/pdf`;
}

export function exportExcelUrl(id: number): string {
  return `/api/tax-returns/${id}/export/xlsx`;
}

export interface EFilingSubmission {
  status: string;
  acknowledgementNumber: string;
  submittedAt: string;
  message: string;
  provider?: string;
  simulated?: boolean;
  itrForm?: string;
}

/** Personal details required to generate the ITR JSON when a real ERI provider is configured. */
export interface ItrTaxpayerInput {
  pan: string;
  firstName?: string;
  lastName: string;
  dateOfBirth: string;
  place?: string;
}

export async function efileTaxReturn(
  id: number,
  taxpayer?: ItrTaxpayerInput,
): Promise<EFilingSubmission> {
  return request(`/api/tax-returns/${id}/efile`, {
    method: 'POST',
    body: JSON.stringify(taxpayer ? { taxpayer } : {}),
  });
}

/** Re-reads the filing status of a submitted return from the e-filing provider. */
export async function refreshEfilingStatus(id: number): Promise<EFilingSubmission> {
  return request(`/api/tax-returns/${id}/efile-status`);
}

export interface MailResult {
  delivered: boolean;
  provider: string;
  message: string;
}

/** Emails the PDF export of a saved calculation to the signed-in user. */
export async function emailTaxReturn(id: number): Promise<MailResult> {
  return request(`/api/tax-returns/${id}/email`, { method: 'POST' });
}

// --- Integrations ---

export interface IntegrationStatus {
  efiling: { provider: string; simulated: boolean };
  form26ASDownload: boolean;
  fxRates: { provider: string };
  oauthProviders: Array<{ name: string; label: string }>;
}

/** Reports which external integrations this deployment is wired up to. */
export async function getIntegrationStatus(): Promise<IntegrationStatus | undefined> {
  if (import.meta.env.VITE_CALCULATION_MODE === 'local') return undefined;
  try {
    return await request<IntegrationStatus>('/api/integrations/status');
  } catch {
    return undefined;
  }
}

/** Downloads and parses Form 26AS through the configured e-filing intermediary. */
export async function fetchForm26AS(
  assessmentYear: string,
  pan: string,
): Promise<Form26ASSummary> {
  const { summary } = await request<{ summary: Form26ASSummary }>('/api/integrations/form-26as', {
    method: 'POST',
    body: JSON.stringify({ assessmentYear, pan }),
  });
  return summary;
}

export interface FxRateSnapshot {
  base: string;
  date: string;
  rates: Record<string, number>;
  source: 'ecb' | 'cache' | 'static';
}

/** Daily reference exchange rates used to show an estimate in a second currency. */
export async function getFxRates(): Promise<FxRateSnapshot | undefined> {
  if (import.meta.env.VITE_CALCULATION_MODE === 'local') return undefined;
  try {
    return await request<FxRateSnapshot>('/api/integrations/fx-rates');
  } catch {
    return undefined;
  }
}

/** URL that starts the OAuth sign-in flow for a provider. */
export function oauthStartUrl(provider: string): string {
  return `/api/auth/oauth/${provider}/start`;
}

// --- Admin config ---

export interface AdminConfigResponse {
  assessmentYear: string;
  config: unknown;
  defaultConfig?: unknown;
  hasOverride?: boolean;
  updatedAt?: string | null;
}

export async function getAdminConfig(assessmentYear: string): Promise<AdminConfigResponse> {
  return request(`/api/admin/config/${assessmentYear}`);
}

export async function updateAdminConfig(
  assessmentYear: string,
  config: unknown,
): Promise<AdminConfigResponse> {
  return request(`/api/admin/config/${assessmentYear}`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  });
}

export async function resetAdminConfig(assessmentYear: string): Promise<AdminConfigResponse> {
  return request(`/api/admin/config/${assessmentYear}`, { method: 'DELETE' });
}
