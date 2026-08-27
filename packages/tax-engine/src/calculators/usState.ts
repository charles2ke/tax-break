import { calculateSlabTax } from './slabTax';
import { SlabBracket, UsState } from '../types';

export interface UsStateTaxConfig {
  name: string;
  /** Standard deduction for a single filer (0 where the state offers none). */
  standardDeduction: number;
  /**
   * Personal exemption for a single filer, where the state grants it as a deduction from income.
   * States that grant it as a tax credit instead (e.g. California, Oregon, Arkansas, Iowa) are
   * encoded as 0 because credits are not modelled.
   */
  personalExemption: number;
  /** Single-filer brackets. An empty list means the state levies no tax on wage income. */
  brackets: SlabBracket[];
}

export interface UsStateTaxResult {
  state: UsState;
  stateDeduction: number;
  stateTaxableIncome: number;
  stateTax: number;
}

const NO_INCOME_TAX: Omit<UsStateTaxConfig, 'name'> = {
  standardDeduction: 0,
  personalExemption: 0,
  brackets: [],
};

function flat(rate: number): SlabBracket[] {
  return [{ from: 0, to: null, rate }];
}

/**
 * 2025 state individual income-tax rates, brackets, standard deductions, and personal exemptions
 * for a single filer. Sources: Tax Foundation "State Individual Income Tax Rates and Brackets,
 * 2025" and the individual state revenue departments.
 *
 * Only the state-level tax on ordinary income is modelled. Local/city/county income taxes
 * (e.g. New York City, Maryland counties, Indiana counties, Ohio municipalities), tax credits,
 * itemised deductions, deduction phase-outs at high incomes, and payroll/social-security
 * contributions are excluded.
 */
export const US_STATE_TAX_CONFIGS: Record<UsState, UsStateTaxConfig> = {
  AL: {
    name: 'Alabama',
    standardDeduction: 2500,
    personalExemption: 1500,
    brackets: [
      { from: 0, to: 500, rate: 0.02 },
      { from: 500, to: 3000, rate: 0.04 },
      { from: 3000, to: null, rate: 0.05 },
    ],
  },
  AK: { name: 'Alaska', ...NO_INCOME_TAX },
  AZ: { name: 'Arizona', standardDeduction: 15750, personalExemption: 0, brackets: flat(0.025) },
  AR: {
    name: 'Arkansas',
    standardDeduction: 2410,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 5500, rate: 0 },
      { from: 5500, to: 10900, rate: 0.02 },
      { from: 10900, to: 15600, rate: 0.03 },
      { from: 15600, to: 25700, rate: 0.034 },
      { from: 25700, to: null, rate: 0.039 },
    ],
  },
  CA: {
    name: 'California',
    standardDeduction: 5706,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 10756, rate: 0.01 },
      { from: 10756, to: 25499, rate: 0.02 },
      { from: 25499, to: 40245, rate: 0.04 },
      { from: 40245, to: 55866, rate: 0.06 },
      { from: 55866, to: 70606, rate: 0.08 },
      { from: 70606, to: 360659, rate: 0.093 },
      { from: 360659, to: 432787, rate: 0.103 },
      { from: 432787, to: 721314, rate: 0.113 },
      { from: 721314, to: 1000000, rate: 0.123 },
      { from: 1000000, to: null, rate: 0.133 },
    ],
  },
  CO: { name: 'Colorado', standardDeduction: 15750, personalExemption: 0, brackets: flat(0.044) },
  CT: {
    name: 'Connecticut',
    standardDeduction: 0,
    personalExemption: 15000,
    brackets: [
      { from: 0, to: 10000, rate: 0.03 },
      { from: 10000, to: 50000, rate: 0.05 },
      { from: 50000, to: 100000, rate: 0.055 },
      { from: 100000, to: 200000, rate: 0.06 },
      { from: 200000, to: 250000, rate: 0.065 },
      { from: 250000, to: 500000, rate: 0.069 },
      { from: 500000, to: null, rate: 0.0699 },
    ],
  },
  DE: {
    name: 'Delaware',
    standardDeduction: 3250,
    personalExemption: 110,
    brackets: [
      { from: 0, to: 2000, rate: 0 },
      { from: 2000, to: 5000, rate: 0.022 },
      { from: 5000, to: 10000, rate: 0.039 },
      { from: 10000, to: 20000, rate: 0.048 },
      { from: 20000, to: 25000, rate: 0.052 },
      { from: 25000, to: 60000, rate: 0.0555 },
      { from: 60000, to: null, rate: 0.066 },
    ],
  },
  DC: {
    name: 'District of Columbia',
    standardDeduction: 5650,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 10000, rate: 0.04 },
      { from: 10000, to: 40000, rate: 0.06 },
      { from: 40000, to: 60000, rate: 0.065 },
      { from: 60000, to: 250000, rate: 0.085 },
      { from: 250000, to: 500000, rate: 0.0925 },
      { from: 500000, to: 1000000, rate: 0.0975 },
      { from: 1000000, to: null, rate: 0.1075 },
    ],
  },
  FL: { name: 'Florida', ...NO_INCOME_TAX },
  GA: { name: 'Georgia', standardDeduction: 5400, personalExemption: 0, brackets: flat(0.0519) },
  HI: {
    name: 'Hawaii',
    standardDeduction: 2200,
    personalExemption: 1144,
    brackets: [
      { from: 0, to: 9600, rate: 0.014 },
      { from: 9600, to: 14400, rate: 0.032 },
      { from: 14400, to: 19200, rate: 0.055 },
      { from: 19200, to: 24000, rate: 0.064 },
      { from: 24000, to: 36000, rate: 0.068 },
      { from: 36000, to: 48000, rate: 0.072 },
      { from: 48000, to: 125000, rate: 0.076 },
      { from: 125000, to: 175000, rate: 0.079 },
      { from: 175000, to: 225000, rate: 0.0825 },
      { from: 225000, to: 275000, rate: 0.09 },
      { from: 275000, to: 325000, rate: 0.1 },
      { from: 325000, to: null, rate: 0.11 },
    ],
  },
  ID: { name: 'Idaho', standardDeduction: 15750, personalExemption: 0, brackets: flat(0.058) },
  IL: { name: 'Illinois', standardDeduction: 0, personalExemption: 2765, brackets: flat(0.0495) },
  IN: { name: 'Indiana', standardDeduction: 0, personalExemption: 1000, brackets: flat(0.0305) },
  IA: { name: 'Iowa', standardDeduction: 15750, personalExemption: 0, brackets: flat(0.038) },
  KS: {
    name: 'Kansas',
    standardDeduction: 3500,
    personalExemption: 2225,
    brackets: [
      { from: 0, to: 23000, rate: 0.052 },
      { from: 23000, to: null, rate: 0.0558 },
    ],
  },
  KY: { name: 'Kentucky', standardDeduction: 2980, personalExemption: 0, brackets: flat(0.04) },
  LA: { name: 'Louisiana', standardDeduction: 4500, personalExemption: 1000, brackets: flat(0.03) },
  ME: {
    name: 'Maine',
    standardDeduction: 15000,
    personalExemption: 5150,
    brackets: [
      { from: 0, to: 26799, rate: 0.058 },
      { from: 26799, to: 63449, rate: 0.0675 },
      { from: 63449, to: null, rate: 0.0715 },
    ],
  },
  MD: {
    name: 'Maryland',
    standardDeduction: 2500,
    personalExemption: 3200,
    brackets: [
      { from: 0, to: 1000, rate: 0.02 },
      { from: 1000, to: 2000, rate: 0.03 },
      { from: 2000, to: 3000, rate: 0.04 },
      { from: 3000, to: 100000, rate: 0.0475 },
      { from: 100000, to: 125000, rate: 0.05 },
      { from: 125000, to: 150000, rate: 0.0525 },
      { from: 150000, to: 250000, rate: 0.055 },
      { from: 250000, to: null, rate: 0.0575 },
    ],
  },
  MA: {
    name: 'Massachusetts',
    standardDeduction: 0,
    personalExemption: 4400,
    brackets: [
      { from: 0, to: 1083150, rate: 0.05 },
      { from: 1083150, to: null, rate: 0.09 },
    ],
  },
  MI: { name: 'Michigan', standardDeduction: 0, personalExemption: 5400, brackets: flat(0.0425) },
  MN: {
    name: 'Minnesota',
    standardDeduction: 14950,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 32570, rate: 0.0535 },
      { from: 32570, to: 106990, rate: 0.068 },
      { from: 106990, to: 198630, rate: 0.0785 },
      { from: 198630, to: null, rate: 0.0985 },
    ],
  },
  MS: {
    name: 'Mississippi',
    standardDeduction: 2300,
    personalExemption: 6000,
    brackets: [
      { from: 0, to: 10000, rate: 0 },
      { from: 10000, to: null, rate: 0.044 },
    ],
  },
  MO: {
    name: 'Missouri',
    standardDeduction: 15750,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 1121, rate: 0 },
      { from: 1121, to: 2242, rate: 0.015 },
      { from: 2242, to: 3363, rate: 0.02 },
      { from: 3363, to: 4484, rate: 0.025 },
      { from: 4484, to: 5605, rate: 0.03 },
      { from: 5605, to: 6726, rate: 0.035 },
      { from: 6726, to: 7847, rate: 0.04 },
      { from: 7847, to: 8968, rate: 0.045 },
      { from: 8968, to: null, rate: 0.048 },
    ],
  },
  MT: {
    name: 'Montana',
    standardDeduction: 15750,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 20500, rate: 0.047 },
      { from: 20500, to: null, rate: 0.059 },
    ],
  },
  NE: {
    name: 'Nebraska',
    standardDeduction: 8600,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 4030, rate: 0.0246 },
      { from: 4030, to: 24120, rate: 0.0351 },
      { from: 24120, to: 38870, rate: 0.0501 },
      { from: 38870, to: null, rate: 0.052 },
    ],
  },
  NV: { name: 'Nevada', ...NO_INCOME_TAX },
  NH: { name: 'New Hampshire', ...NO_INCOME_TAX },
  NJ: {
    name: 'New Jersey',
    standardDeduction: 0,
    personalExemption: 1000,
    brackets: [
      { from: 0, to: 20000, rate: 0.014 },
      { from: 20000, to: 35000, rate: 0.0175 },
      { from: 35000, to: 40000, rate: 0.035 },
      { from: 40000, to: 75000, rate: 0.05525 },
      { from: 75000, to: 500000, rate: 0.0637 },
      { from: 500000, to: 1000000, rate: 0.0897 },
      { from: 1000000, to: null, rate: 0.1075 },
    ],
  },
  NM: {
    name: 'New Mexico',
    standardDeduction: 15750,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 5500, rate: 0.015 },
      { from: 5500, to: 16500, rate: 0.032 },
      { from: 16500, to: 33500, rate: 0.043 },
      { from: 33500, to: 66500, rate: 0.047 },
      { from: 66500, to: 210000, rate: 0.049 },
      { from: 210000, to: null, rate: 0.059 },
    ],
  },
  NY: {
    name: 'New York',
    standardDeduction: 8000,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 8500, rate: 0.04 },
      { from: 8500, to: 11700, rate: 0.045 },
      { from: 11700, to: 13900, rate: 0.0525 },
      { from: 13900, to: 80650, rate: 0.055 },
      { from: 80650, to: 215400, rate: 0.06 },
      { from: 215400, to: 1077550, rate: 0.0685 },
      { from: 1077550, to: 5000000, rate: 0.0965 },
      { from: 5000000, to: 25000000, rate: 0.103 },
      { from: 25000000, to: null, rate: 0.109 },
    ],
  },
  NC: {
    name: 'North Carolina',
    standardDeduction: 7500,
    personalExemption: 0,
    brackets: flat(0.0475),
  },
  ND: {
    name: 'North Dakota',
    standardDeduction: 15750,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 48475, rate: 0 },
      { from: 48475, to: 244825, rate: 0.0195 },
      { from: 244825, to: null, rate: 0.025 },
    ],
  },
  OH: {
    name: 'Ohio',
    standardDeduction: 0,
    personalExemption: 2650,
    brackets: [
      { from: 0, to: 26050, rate: 0 },
      { from: 26050, to: 100000, rate: 0.0275 },
      { from: 100000, to: null, rate: 0.03125 },
    ],
  },
  OK: {
    name: 'Oklahoma',
    standardDeduction: 6350,
    personalExemption: 1000,
    brackets: [
      { from: 0, to: 999, rate: 0.0025 },
      { from: 999, to: 2499, rate: 0.0075 },
      { from: 2499, to: 3749, rate: 0.0175 },
      { from: 3749, to: 4899, rate: 0.0275 },
      { from: 4899, to: 7199, rate: 0.0375 },
      { from: 7199, to: null, rate: 0.0475 },
    ],
  },
  OR: {
    name: 'Oregon',
    standardDeduction: 2835,
    personalExemption: 0,
    brackets: [
      { from: 0, to: 4400, rate: 0.0475 },
      { from: 4400, to: 11050, rate: 0.0675 },
      { from: 11050, to: 125000, rate: 0.0875 },
      { from: 125000, to: null, rate: 0.099 },
    ],
  },
  PA: { name: 'Pennsylvania', standardDeduction: 0, personalExemption: 0, brackets: flat(0.0307) },
  RI: {
    name: 'Rhode Island',
    standardDeduction: 10900,
    personalExemption: 5100,
    brackets: [
      { from: 0, to: 79900, rate: 0.0375 },
      { from: 79900, to: 181650, rate: 0.0475 },
      { from: 181650, to: null, rate: 0.0599 },
    ],
  },
  SC: {
    name: 'South Carolina',
    standardDeduction: 15750,
    personalExemption: 4770,
    brackets: [
      { from: 0, to: 3460, rate: 0 },
      { from: 3460, to: 17330, rate: 0.03 },
      { from: 17330, to: null, rate: 0.06 },
    ],
  },
  SD: { name: 'South Dakota', ...NO_INCOME_TAX },
  TN: { name: 'Tennessee', ...NO_INCOME_TAX },
  TX: { name: 'Texas', ...NO_INCOME_TAX },
  UT: { name: 'Utah', standardDeduction: 15750, personalExemption: 0, brackets: flat(0.0465) },
  VT: {
    name: 'Vermont',
    standardDeduction: 7650,
    personalExemption: 5300,
    brackets: [
      { from: 0, to: 47900, rate: 0.0335 },
      { from: 47900, to: 116000, rate: 0.066 },
      { from: 116000, to: 242000, rate: 0.076 },
      { from: 242000, to: null, rate: 0.0875 },
    ],
  },
  VA: {
    name: 'Virginia',
    standardDeduction: 8500,
    personalExemption: 930,
    brackets: [
      { from: 0, to: 3000, rate: 0.02 },
      { from: 3000, to: 5000, rate: 0.03 },
      { from: 5000, to: 17000, rate: 0.05 },
      { from: 17000, to: null, rate: 0.0575 },
    ],
  },
  WA: { name: 'Washington', ...NO_INCOME_TAX },
  WV: {
    name: 'West Virginia',
    standardDeduction: 2000,
    personalExemption: 2000,
    brackets: [
      { from: 0, to: 10000, rate: 0.0222 },
      { from: 10000, to: 25000, rate: 0.0296 },
      { from: 25000, to: 40000, rate: 0.0333 },
      { from: 40000, to: 60000, rate: 0.0444 },
      { from: 60000, to: null, rate: 0.0482 },
    ],
  },
  WI: {
    name: 'Wisconsin',
    standardDeduction: 13930,
    personalExemption: 700,
    brackets: [
      { from: 0, to: 14319, rate: 0.035 },
      { from: 14319, to: 28639, rate: 0.044 },
      { from: 28639, to: 315309, rate: 0.053 },
      { from: 315309, to: null, rate: 0.0765 },
    ],
  },
  WY: { name: 'Wyoming', ...NO_INCOME_TAX },
};

/** Lists the supported US states (plus DC), sorted by name, for UI selection. */
export function listUsStates(): { code: UsState; name: string }[] {
  return (Object.keys(US_STATE_TAX_CONFIGS) as UsState[])
    .map((code) => ({ code, name: US_STATE_TAX_CONFIGS[code].name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Estimates the 2025 state income tax for a single filer resident in the given state.
 * The state deduction is applied to federal gross income; state-specific add-backs,
 * subtractions, credits, and local income taxes are not modelled.
 */
export function calculateUsStateTax(grossIncome: number, state: UsState): UsStateTaxResult {
  const config = US_STATE_TAX_CONFIGS[state];
  const income = Math.max(0, grossIncome);
  const stateDeduction = Math.min(income, config.standardDeduction + config.personalExemption);
  const stateTaxableIncome = income - stateDeduction;
  const stateTax = Math.round(calculateSlabTax(stateTaxableIncome, config.brackets) * 100) / 100;

  return { state, stateDeduction, stateTaxableIncome, stateTax };
}
