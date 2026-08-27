import { calculateSlabTax } from './slabTax';
import { InternationalTaxCalculationInput, InternationalTaxResult, SlabBracket } from '../types';

interface CountryTaxConfig {
  currency: string;
  standardDeduction: number;
  slabs: SlabBracket[];
}

// 2025 resident individual income-tax rates. This estimator excludes payroll/social-security
// contributions, local taxes, credits, allowances, and country-specific reliefs.
const COUNTRY_CONFIGS: Record<InternationalTaxCalculationInput['country'], CountryTaxConfig> = {
  ireland: {
    currency: 'EUR',
    standardDeduction: 0,
    slabs: [
      { from: 0, to: 44000, rate: 0.2 },
      { from: 44000, to: null, rate: 0.4 },
    ],
  },
  netherlands: {
    currency: 'EUR',
    standardDeduction: 0,
    slabs: [
      { from: 0, to: 38441, rate: 0.3582 },
      { from: 38441, to: 76817, rate: 0.3748 },
      { from: 76817, to: null, rate: 0.495 },
    ],
  },
  uk: {
    currency: 'GBP',
    standardDeduction: 12570,
    slabs: [
      { from: 0, to: 37700, rate: 0.2 },
      { from: 37700, to: 125140, rate: 0.4 },
      { from: 125140, to: null, rate: 0.45 },
    ],
  },
  us: {
    currency: 'USD',
    standardDeduction: 15000,
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

  return {
    country: input.country,
    currency: config.currency,
    grossIncome,
    standardDeduction,
    taxableIncome,
    incomeTax,
    totalTaxLiability: incomeTax,
    effectiveTaxRate: grossIncome > 0 ? (incomeTax / grossIncome) * 100 : 0,
  };
}
