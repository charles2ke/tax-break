import { calculateSlabTax } from './slabTax';
import { calculateUsStateTax } from './usState';
import { InternationalTaxCalculationInput, InternationalTaxResult, SlabBracket } from '../types';

interface CountryTaxConfig {
  currency: string;
  standardDeduction: number;
  slabs: SlabBracket[];
  /**
   * Non-refundable tax credits (in local currency) that reduce the bracket tax. Credits may be
   * fixed or computed from taxable income when they are a standard, automatic part of the
   * individual assessment.
   */
  taxCredits: number | ((taxableIncome: number) => number);
}

/**
 * Dutch general tax credit (algemene heffingskorting) for taxpayers below the AOW (state pension)
 * age, 2025 amounts: EUR 3,068 up to EUR 28,406 of income, then tapered at 6.337% and fully phased
 * out from EUR 76,817.
 */
function dutchGeneralTaxCredit(income: number): number {
  if (income <= 28406) return 3068;
  if (income >= 76817) return 0;
  return Math.max(0, 3068 - 0.06337 * (income - 28406));
}

/**
 * Dutch labour tax credit (arbeidskorting) for taxpayers below the AOW age, 2025 amounts. The
 * estimator treats the whole income as employment income (arbeidsinkomen).
 */
function dutchLabourTaxCredit(income: number): number {
  if (income <= 12169) return 0.08053 * income;
  if (income <= 26288) return 980 + 0.3003 * (income - 12169);
  if (income <= 43071) return 5220 + 0.02258 * (income - 26288);
  if (income >= 129078) return 0;
  return Math.max(0, 5599 - 0.0651 * (income - 43071));
}

// 2025 resident individual income-tax rates. Unless noted per country, this estimator excludes
// payroll/social-security contributions, local taxes, and other country-specific reliefs.
const COUNTRY_CONFIGS: Record<InternationalTaxCalculationInput['country'], CountryTaxConfig> = {
  ireland: {
    currency: 'EUR',
    standardDeduction: 0,
    // Single PAYE employee: personal tax credit (EUR 2,000) + employee tax credit (EUR 2,000).
    taxCredits: 4000,
    slabs: [
      // Standard rate cut-off point for a single individual in 2025.
      { from: 0, to: 44000, rate: 0.2 },
      { from: 44000, to: null, rate: 0.4 },
    ],
  },
  // The Netherlands levies income tax only at national level: there is no provincial or municipal
  // income tax, so no regional add-on applies. Box 1 (work and home) rates below are for taxpayers
  // under the AOW age and already include national social-security contributions in the first two
  // brackets. The general and labour tax credits are applied as non-refundable credits.
  netherlands: {
    currency: 'EUR',
    standardDeduction: 0,
    slabs: [
      { from: 0, to: 38441, rate: 0.3582 },
      { from: 38441, to: 76817, rate: 0.3748 },
      { from: 76817, to: null, rate: 0.495 },
    ],
    taxCredits: (taxableIncome) =>
      dutchGeneralTaxCredit(taxableIncome) + dutchLabourTaxCredit(taxableIncome),
  },
  uk: {
    currency: 'GBP',
    standardDeduction: 12570,
    taxCredits: 0,
    slabs: [
      { from: 0, to: 37700, rate: 0.2 },
      { from: 37700, to: 125140, rate: 0.4 },
      { from: 125140, to: null, rate: 0.45 },
    ],
  },
  us: {
    currency: 'USD',
    // 2025 single-filer standard deduction (IRS Rev. Proc. 2024-40, as amended by the
    // One Big Beautiful Bill Act).
    standardDeduction: 15750,
    taxCredits: 0,
    slabs: [
      { from: 0, to: 11925, rate: 0.1 },
      { from: 11925, to: 48475, rate: 0.12 },
      { from: 48475, to: 103350, rate: 0.22 },
      { from: 103350, to: 197300, rate: 0.24 },
      { from: 197300, to: 250525, rate: 0.32 },
      { from: 250525, to: 626350, rate: 0.35 },
      { from: 626350, to: null, rate: 0.37 },
    ],
  },
  singapore: {
    currency: 'SGD',
    standardDeduction: 0,
    taxCredits: 0,
    slabs: [
      { from: 0, to: 20000, rate: 0 },
      { from: 20000, to: 30000, rate: 0.02 },
      { from: 30000, to: 40000, rate: 0.035 },
      { from: 40000, to: 80000, rate: 0.07 },
      { from: 80000, to: 120000, rate: 0.115 },
      { from: 120000, to: 160000, rate: 0.15 },
      { from: 160000, to: 200000, rate: 0.18 },
      { from: 200000, to: 240000, rate: 0.19 },
      { from: 240000, to: 280000, rate: 0.195 },
      { from: 280000, to: 320000, rate: 0.2 },
      { from: 320000, to: null, rate: 0.22 },
    ],
  },
};

export function calculateInternationalTax(
  input: InternationalTaxCalculationInput,
): InternationalTaxResult {
  const config = COUNTRY_CONFIGS[input.country];
  const grossIncome = Math.max(0, input.annualIncome);
  const standardDeduction = Math.min(grossIncome, config.standardDeduction);
  const taxableIncome = grossIncome - standardDeduction;
  const incomeTax = Math.round(calculateSlabTax(taxableIncome, config.slabs) * 100) / 100;
  // Credits are non-refundable: they can reduce the liability to zero but never below it.
  const configuredTaxCredits =
    typeof config.taxCredits === 'function' ? config.taxCredits(taxableIncome) : config.taxCredits;
  const taxCredits = Math.round(Math.min(incomeTax, configuredTaxCredits) * 100) / 100;

  if (input.country === 'us') {
    const stateResult = input.state ? calculateUsStateTax(grossIncome, input.state) : undefined;
    const totalTaxLiability =
      Math.round((incomeTax - taxCredits + (stateResult?.stateTax ?? 0)) * 100) / 100;

    return {
      country: input.country,
      currency: config.currency,
      grossIncome,
      standardDeduction,
      taxableIncome,
      incomeTax,
      taxCredits,
      ...(stateResult
        ? {
            state: stateResult.state,
            stateTax: stateResult.stateTax,
            stateTaxableIncome: stateResult.stateTaxableIncome,
          }
        : {}),
      totalTaxLiability,
      effectiveTaxRate: grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0,
    };
  }

  const totalTaxLiability = Math.round((incomeTax - taxCredits) * 100) / 100;

  return {
    country: input.country,
    currency: config.currency,
    grossIncome,
    standardDeduction,
    taxableIncome,
    incomeTax,
    taxCredits,
    totalTaxLiability,
    effectiveTaxRate: grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0,
  };
}
