import { SlabBracket, SurchargeSlab } from '../types';
import { calculateSlabTax } from './slabTax';

export interface SurchargeResult {
  surcharge: number;
  marginalRelief: number;
  rate: number;
}

/**
 * Computes surcharge applicable on tax (before cess) based on taxable income, applying
 * marginal relief so that the incremental tax + surcharge does not exceed the incremental
 * income beyond the surcharge threshold.
 */
export function calculateSurcharge(
  taxableIncome: number,
  taxBeforeSurcharge: number,
  surchargeSlabs: SurchargeSlab[],
  slabs: SlabBracket[],
): SurchargeResult {
  const sorted = [...surchargeSlabs].sort((a, b) => a.threshold - b.threshold);

  let applicableIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (taxableIncome > sorted[i].threshold) {
      applicableIndex = i;
    }
  }

  if (applicableIndex === -1) {
    return { surcharge: 0, marginalRelief: 0, rate: 0 };
  }

  const tier = sorted[applicableIndex];
  const previousRate = applicableIndex > 0 ? sorted[applicableIndex - 1].rate : 0;

  const rawSurcharge = taxBeforeSurcharge * tier.rate;

  const taxAtThreshold = calculateSlabTax(tier.threshold, slabs);
  const baseTotal = taxAtThreshold * (1 + previousRate);
  const excessIncome = taxableIncome - tier.threshold;
  const maxAllowedTotal = baseTotal + excessIncome;

  const actualTotal = taxBeforeSurcharge + rawSurcharge;

  if (actualTotal > maxAllowedTotal) {
    const adjustedSurcharge = Math.max(0, maxAllowedTotal - taxBeforeSurcharge);
    return {
      surcharge: adjustedSurcharge,
      marginalRelief: rawSurcharge - adjustedSurcharge,
      rate: tier.rate,
    };
  }

  return { surcharge: rawSurcharge, marginalRelief: 0, rate: tier.rate };
}
