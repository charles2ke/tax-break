import { RebateConfig } from '../types';

/**
 * Computes Section 87A rebate. Rebate applies in full (making tax nil) when taxable
 * income does not exceed the configured limit, capped at the maximum rebate amount.
 */
export function calculateRebate87A(taxableIncome: number, taxBeforeRebate: number, config: RebateConfig): number {
  if (taxableIncome > config.incomeLimit) return 0;
  return Math.min(taxBeforeRebate, config.maxAmount);
}
