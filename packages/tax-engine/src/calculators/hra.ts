import { CityType, HraExemptionResult } from '../types';

/**
 * Computes HRA exemption under Section 10(13A) of the Income Tax Act.
 * Exemption = least of:
 *   1. Actual HRA received
 *   2. Rent paid minus 10% of basic salary
 *   3. 50% of basic salary (metro) or 40% of basic salary (non-metro)
 */
export function calculateHraExemption(
  basic: number,
  hraReceived: number,
  rentPaid: number,
  cityType: CityType,
): HraExemptionResult {
  const safeBasic = Math.max(0, basic);
  const safeHra = Math.max(0, hraReceived);
  const safeRent = Math.max(0, rentPaid);

  const rentMinusTenPercentBasic = Math.max(0, safeRent - 0.1 * safeBasic);
  const metroPercentage = cityType === 'metro' ? 0.5 : 0.4;
  const metroLimit = metroPercentage * safeBasic;

  const exemptAmount = safeRent > 0 ? Math.max(0, Math.min(safeHra, rentMinusTenPercentBasic, metroLimit)) : 0;

  const taxableHra = Math.max(0, safeHra - exemptAmount);

  return {
    actualHraReceived: safeHra,
    rentMinusTenPercentBasic,
    metroLimit,
    exemptAmount,
    taxableHra,
  };
}
