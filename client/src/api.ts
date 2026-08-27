import type {
  InternationalTaxCalculationInput,
  InternationalTaxResult,
  RegimeComparisonResult,
  TaxCalculationInput,
} from '@tax-break/tax-engine';
import { calculateInternationalTax, compareRegimes } from '@tax-break/tax-engine';

export class ApiError extends Error {}

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

  const response = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.status === 404) {
    return calculateLocally(input);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error ?? 'Failed to calculate tax');
  }

  return (await response.json()) as RegimeComparisonResult | InternationalTaxResult;
}
