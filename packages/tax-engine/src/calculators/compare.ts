import { RegimeComparisonResult, TaxCalculationInput } from '../types';
import { calculateTaxForRegime } from './regime';

/**
 * Computes tax under both Old and New regimes for the same input and determines
 * which regime is more beneficial along with the savings amount.
 */
export function compareRegimes(input: TaxCalculationInput): RegimeComparisonResult {
  const oldRegime = calculateTaxForRegime(input, 'old');
  const newRegime = calculateTaxForRegime(input, 'new');

  const recommendedRegime = newRegime.totalTaxLiability <= oldRegime.totalTaxLiability ? 'new' : 'old';
  const savings = Math.abs(oldRegime.totalTaxLiability - newRegime.totalTaxLiability);

  return {
    old: oldRegime,
    new: newRegime,
    recommendedRegime,
    savings,
  };
}
