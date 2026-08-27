import { RebateConfig } from '../types';

/**
 * Computes Section 87A rebate. Rebate applies in full (making tax nil) when taxable
 * income does not exceed the configured limit, capped at the maximum rebate amount.
 *
 * Where the configuration enables marginal relief (the New Regime from FY 2023-24 onwards), a
 * partial rebate is granted just above the limit so that the tax payable never exceeds the
 * income earned in excess of that limit.
 */
export function calculateRebate87A(taxableIncome: number, taxBeforeRebate: number, config: RebateConfig): number {
  if (taxableIncome <= config.incomeLimit) {
    return Math.min(taxBeforeRebate, config.maxAmount);
  }

  if (!config.marginalRelief) return 0;

  const excessIncome = taxableIncome - config.incomeLimit;
  return Math.max(0, Math.min(taxBeforeRebate, taxBeforeRebate - excessIncome));
}
