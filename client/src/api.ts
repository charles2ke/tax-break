import type { RegimeComparisonResult, TaxCalculationInput } from '@tax-break/tax-engine';

export class ApiError extends Error {}

export async function calculateTax(input: TaxCalculationInput): Promise<RegimeComparisonResult> {
  const response = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error ?? 'Failed to calculate tax');
  }

  return (await response.json()) as RegimeComparisonResult;
}
