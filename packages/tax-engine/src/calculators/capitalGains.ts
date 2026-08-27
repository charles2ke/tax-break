import { CapitalGainsBreakdown, CapitalGainsInput, CapitalGainsRates } from '../types';

/**
 * Default capital gains tax rates, applicable from FY 2024-25 (post 23 July 2024 Budget
 * changes) onward. Earlier assessment years supply their own rates through
 * `AssessmentYearConfig.capitalGains`. This is an estimation only; indexation benefit for LTCG
 * on non-equity assets acquired before 23 July 2024 is not modeled, and for FY 2024-25 the
 * pre-23 July 2024 rates on transfers made earlier in that year are not modeled either.
 */
export const CAPITAL_GAINS_RATES: CapitalGainsRates = {
  equitySTCGRate: 0.2,
  equityLTCGRate: 0.125,
  equityLTCGExemption: 125000,
  otherLTCGRate: 0.125,
};

/**
 * Computes the tax on capital gains. Short-term capital gains on non-equity assets (Section
 * 111A does not apply) are taxed at slab rates, so they are surfaced separately to be added to
 * the regular taxable income rather than taxed here.
 */
export function calculateCapitalGains(
  input?: CapitalGainsInput,
  rates: CapitalGainsRates = CAPITAL_GAINS_RATES,
): CapitalGainsBreakdown {
  const equitySTCG = Math.max(0, input?.equitySTCG ?? 0);
  const equityLTCG = Math.max(0, input?.equityLTCG ?? 0);
  const otherSTCG = Math.max(0, input?.otherSTCG ?? 0);
  const otherLTCG = Math.max(0, input?.otherLTCG ?? 0);

  const equitySTCGTax = equitySTCG * rates.equitySTCGRate;

  const equityLTCGExemptionUsed = Math.min(equityLTCG, rates.equityLTCGExemption);
  const taxableEquityLTCG = Math.max(0, equityLTCG - rates.equityLTCGExemption);
  const equityLTCGTax = taxableEquityLTCG * rates.equityLTCGRate;

  const otherLTCGTax = otherLTCG * rates.otherLTCGRate;

  const totalCapitalGainsTax = equitySTCGTax + equityLTCGTax + otherLTCGTax;
  const totalCapitalGainsIncome = equitySTCG + equityLTCG + otherSTCG + otherLTCG;

  return {
    equitySTCG,
    equityLTCG,
    otherSTCG,
    otherLTCG,
    equitySTCGTax,
    equityLTCGExemptionUsed,
    equityLTCGTax,
    otherLTCGTax,
    otherSTCGAddedToIncome: otherSTCG,
    totalCapitalGainsTax,
    totalCapitalGainsIncome,
  };
}
