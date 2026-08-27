import { CapitalGainsBreakdown, CapitalGainsInput } from '../types';

/**
 * Simplified capital gains tax rates applicable from FY 2024-25 (post 23 July 2024 Budget
 * changes) onward, used for both supported assessment years for consistency. This is an
 * estimation only; indexation benefit for LTCG on non-equity assets acquired before 23 July
 * 2024 is not modeled.
 */
export const CAPITAL_GAINS_RATES = {
  /** Section 111A - STCG on listed equity shares / equity-oriented mutual funds (STT paid). */
  equitySTCGRate: 0.2,
  /** Section 112A - LTCG on listed equity shares / equity-oriented mutual funds (STT paid). */
  equityLTCGRate: 0.125,
  /** Annual exemption available on Section 112A LTCG. */
  equityLTCGExemption: 125000,
  /** Section 112 - LTCG on other assets (debt funds, property, unlisted shares, etc). */
  otherLTCGRate: 0.125,
};

/**
 * Computes the tax on capital gains. Short-term capital gains on non-equity assets (Section
 * 111A does not apply) are taxed at slab rates, so they are surfaced separately to be added to
 * the regular taxable income rather than taxed here.
 */
export function calculateCapitalGains(input?: CapitalGainsInput): CapitalGainsBreakdown {
  const equitySTCG = Math.max(0, input?.equitySTCG ?? 0);
  const equityLTCG = Math.max(0, input?.equityLTCG ?? 0);
  const otherSTCG = Math.max(0, input?.otherSTCG ?? 0);
  const otherLTCG = Math.max(0, input?.otherLTCG ?? 0);

  const equitySTCGTax = equitySTCG * CAPITAL_GAINS_RATES.equitySTCGRate;

  const equityLTCGExemptionUsed = Math.min(equityLTCG, CAPITAL_GAINS_RATES.equityLTCGExemption);
  const taxableEquityLTCG = Math.max(0, equityLTCG - CAPITAL_GAINS_RATES.equityLTCGExemption);
  const equityLTCGTax = taxableEquityLTCG * CAPITAL_GAINS_RATES.equityLTCGRate;

  const otherLTCGTax = otherLTCG * CAPITAL_GAINS_RATES.otherLTCGRate;

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
