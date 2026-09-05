import { calculateSlabTax } from './slabTax';
import { calculateUsStateTax } from './usState';
import {
  InternationalTaxResult,
  SlabBracket,
  UsFilingStatus,
  UsTaxCalculationInput,
} from '../types';

/**
 * 2025 federal ordinary income tax brackets by filing status (IRS Rev. Proc. 2024-40).
 */
const FEDERAL_BRACKETS: Record<UsFilingStatus, SlabBracket[]> = {
  single: [
    { from: 0, to: 11925, rate: 0.1 },
    { from: 11925, to: 48475, rate: 0.12 },
    { from: 48475, to: 103350, rate: 0.22 },
    { from: 103350, to: 197300, rate: 0.24 },
    { from: 197300, to: 250525, rate: 0.32 },
    { from: 250525, to: 626350, rate: 0.35 },
    { from: 626350, to: null, rate: 0.37 },
  ],
  marriedJoint: [
    { from: 0, to: 23850, rate: 0.1 },
    { from: 23850, to: 96950, rate: 0.12 },
    { from: 96950, to: 206700, rate: 0.22 },
    { from: 206700, to: 394600, rate: 0.24 },
    { from: 394600, to: 501050, rate: 0.32 },
    { from: 501050, to: 751600, rate: 0.35 },
    { from: 751600, to: null, rate: 0.37 },
  ],
  marriedSeparate: [
    { from: 0, to: 11925, rate: 0.1 },
    { from: 11925, to: 48475, rate: 0.12 },
    { from: 48475, to: 103350, rate: 0.22 },
    { from: 103350, to: 197300, rate: 0.24 },
    { from: 197300, to: 250525, rate: 0.32 },
    { from: 250525, to: 375800, rate: 0.35 },
    { from: 375800, to: null, rate: 0.37 },
  ],
  headOfHousehold: [
    { from: 0, to: 17000, rate: 0.1 },
    { from: 17000, to: 64850, rate: 0.12 },
    { from: 64850, to: 103350, rate: 0.22 },
    { from: 103350, to: 197300, rate: 0.24 },
    { from: 197300, to: 250500, rate: 0.32 },
    { from: 250500, to: 626350, rate: 0.35 },
    { from: 626350, to: null, rate: 0.37 },
  ],
};

/**
 * 2025 standard deductions, as increased by the One Big Beautiful Bill Act.
 */
const STANDARD_DEDUCTION: Record<UsFilingStatus, number> = {
  single: 15750,
  marriedJoint: 31500,
  marriedSeparate: 15750,
  headOfHousehold: 23625,
};

/** 2025 taxable-income thresholds where the 15% and 20% long-term capital gains rates start. */
const CAPITAL_GAINS_THRESHOLDS: Record<UsFilingStatus, { fifteen: number; twenty: number }> = {
  single: { fifteen: 48350, twenty: 533400 },
  marriedJoint: { fifteen: 96700, twenty: 600050 },
  marriedSeparate: { fifteen: 48350, twenty: 300000 },
  headOfHousehold: { fifteen: 64750, twenty: 566700 },
};

/** Child tax credit and credit for other dependents, with the AGI phase-out. */
const CHILD_TAX_CREDIT = 2200;
const OTHER_DEPENDENT_CREDIT = 500;
const CTC_PHASE_OUT_THRESHOLD: Record<UsFilingStatus, number> = {
  single: 200000,
  marriedJoint: 400000,
  marriedSeparate: 200000,
  headOfHousehold: 200000,
};
/** The credit falls by $50 for every $1,000, or part thereof, of income above the threshold. */
const CTC_PHASE_OUT_PER_THOUSAND = 50;

/** 2025 payroll taxes. */
const SOCIAL_SECURITY_WAGE_BASE = 176100;
const SOCIAL_SECURITY_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const SELF_EMPLOYMENT_TAXABLE_SHARE = 0.9235;

/**
 * Shared thresholds for the additional Medicare tax and the net investment income tax. The
 * additional Medicare tax compares earned income against the threshold, while the net investment
 * income tax compares adjusted gross income against the same amounts.
 */
const HIGH_INCOME_THRESHOLD: Record<UsFilingStatus, number> = {
  single: 200000,
  marriedJoint: 250000,
  marriedSeparate: 125000,
  headOfHousehold: 200000,
};
const NIIT_RATE = 0.038;

/** Above-the-line cap on the student loan interest deduction. */
const STUDENT_LOAN_INTEREST_CAP = 2500;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

/** Self-employment tax (Social Security and Medicare) on net self-employment earnings. */
export function usSelfEmploymentTax(selfEmploymentIncome: number, wages: number): number {
  const netEarnings = Math.max(0, selfEmploymentIncome) * SELF_EMPLOYMENT_TAXABLE_SHARE;
  if (netEarnings <= 0) return 0;
  const socialSecurityBase = Math.max(
    0,
    Math.min(netEarnings, SOCIAL_SECURITY_WAGE_BASE - Math.max(0, wages)),
  );
  return round2(socialSecurityBase * SOCIAL_SECURITY_RATE * 2 + netEarnings * MEDICARE_RATE * 2);
}

/** Employee Social Security and Medicare tax withheld on wages. */
export function usFicaTax(wages: number): number {
  const earnings = Math.max(0, wages);
  return round2(
    Math.min(earnings, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE + earnings * MEDICARE_RATE,
  );
}

/**
 * Tax on qualified dividends and net long-term capital gains, stacked on top of ordinary taxable
 * income at the 0%, 15% and 20% preferential rates.
 */
export function usCapitalGainsTax(
  preferentialIncome: number,
  ordinaryTaxableIncome: number,
  filingStatus: UsFilingStatus,
): number {
  const gains = Math.max(0, preferentialIncome);
  if (gains <= 0) return 0;
  const { fifteen, twenty } = CAPITAL_GAINS_THRESHOLDS[filingStatus];
  const start = Math.max(0, ordinaryTaxableIncome);
  const end = start + gains;
  const inBand = (from: number, to: number | null) =>
    Math.max(0, Math.min(end, to ?? Infinity) - Math.max(start, from));
  return round2(inBand(fifteen, twenty) * 0.15 + inBand(twenty, null) * 0.2);
}

/** Child tax credit and credit for other dependents after the AGI phase-out. */
export function usChildTaxCredit(
  dependentsUnder17: number,
  otherDependents: number,
  adjustedGrossIncome: number,
  filingStatus: UsFilingStatus,
): number {
  const base =
    Math.max(0, dependentsUnder17) * CHILD_TAX_CREDIT +
    Math.max(0, otherDependents) * OTHER_DEPENDENT_CREDIT;
  if (base <= 0) return 0;
  const excess = Math.max(0, adjustedGrossIncome - CTC_PHASE_OUT_THRESHOLD[filingStatus]);
  const reduction = Math.ceil(excess / 1000) * CTC_PHASE_OUT_PER_THOUSAND;
  return round2(Math.max(0, base - reduction));
}

/**
 * Estimates the US federal (and optionally state) tax liability of a resident individual for the
 * 2025 tax year, covering wages, self-employment, investment income, above-the-line adjustments,
 * the standard or itemised deduction, preferential capital gains rates, the child tax credit,
 * payroll taxes and the net investment income tax.
 */
export function calculateUsTax(input: UsTaxCalculationInput): InternationalTaxResult {
  const filingStatus = input.filingStatus ?? 'single';
  const wages = positive(input.annualIncome) + positive(input.bonus);
  const selfEmploymentIncome = positive(input.selfEmploymentIncome);
  const interestIncome = positive(input.interestIncome);
  const ordinaryDividends = positive(input.ordinaryDividends);
  const qualifiedDividends = positive(input.qualifiedDividends);
  const shortTermCapitalGains = positive(input.shortTermCapitalGains);
  const longTermCapitalGains = positive(input.longTermCapitalGains);
  const otherIncome = positive(input.otherIncome);

  const ordinaryIncome = round2(
    wages +
      selfEmploymentIncome +
      interestIncome +
      ordinaryDividends +
      shortTermCapitalGains +
      otherIncome,
  );
  const preferentialIncome = round2(qualifiedDividends + longTermCapitalGains);
  const grossIncome = round2(ordinaryIncome + preferentialIncome);

  const selfEmploymentTax = usSelfEmploymentTax(selfEmploymentIncome, wages);
  const adjustments = round2(
    positive(input.retirementContributions) +
      positive(input.hsaContributions) +
      Math.min(positive(input.studentLoanInterest), STUDENT_LOAN_INTEREST_CAP) +
      selfEmploymentTax / 2,
  );
  const adjustedGrossIncome = round2(Math.max(0, grossIncome - adjustments));

  const standardDeduction = STANDARD_DEDUCTION[filingStatus];
  const itemizedDeductions = positive(input.itemizedDeductions);
  const deductionUsed = Math.max(standardDeduction, itemizedDeductions);

  const taxableIncome = round2(Math.max(0, adjustedGrossIncome - deductionUsed));
  // Preferential income sits at the top of taxable income; the rest is taxed at ordinary rates.
  const ordinaryTaxableIncome = round2(Math.max(0, taxableIncome - preferentialIncome));
  const ordinaryTax = round2(
    calculateSlabTax(ordinaryTaxableIncome, FEDERAL_BRACKETS[filingStatus]),
  );
  const capitalGainsTax = usCapitalGainsTax(
    Math.min(preferentialIncome, taxableIncome),
    ordinaryTaxableIncome,
    filingStatus,
  );
  const incomeTax = round2(ordinaryTax + capitalGainsTax);

  const childTaxCredit = usChildTaxCredit(
    positive(input.dependentsUnder17),
    positive(input.otherDependents),
    adjustedGrossIncome,
    filingStatus,
  );
  // Credits are treated as non-refundable: they can reduce the tax to zero but never below it.
  const taxCredits = round2(Math.min(incomeTax, childTaxCredit));

  const ficaTax = usFicaTax(wages);
  const earnedIncome = wages + selfEmploymentIncome * SELF_EMPLOYMENT_TAXABLE_SHARE;
  const additionalMedicareTax = round2(
    Math.max(0, earnedIncome - HIGH_INCOME_THRESHOLD[filingStatus]) * ADDITIONAL_MEDICARE_RATE,
  );

  const netInvestmentIncome =
    interestIncome +
    ordinaryDividends +
    qualifiedDividends +
    shortTermCapitalGains +
    longTermCapitalGains;
  const netInvestmentIncomeTax = round2(
    Math.min(netInvestmentIncome, Math.max(0, adjustedGrossIncome - HIGH_INCOME_THRESHOLD[filingStatus])) *
      NIIT_RATE,
  );

  const stateResult = input.state ? calculateUsStateTax(grossIncome, input.state) : undefined;
  const totalTaxLiability = round2(
    incomeTax -
      taxCredits +
      ficaTax +
      selfEmploymentTax +
      additionalMedicareTax +
      netInvestmentIncomeTax +
      (stateResult?.stateTax ?? 0),
  );

  return {
    country: 'us',
    currency: 'USD',
    grossIncome,
    standardDeduction: deductionUsed,
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
    us: {
      filingStatus,
      ordinaryIncome,
      preferentialIncome,
      adjustments,
      adjustedGrossIncome,
      standardDeduction,
      itemizedDeductions,
      deductionUsed,
      ordinaryTaxableIncome,
      ordinaryTax,
      capitalGainsTax,
      childTaxCredit,
      ficaTax,
      selfEmploymentTax,
      additionalMedicareTax,
      netInvestmentIncomeTax,
      netIncome: round2(grossIncome - totalTaxLiability),
    },
  };
}
