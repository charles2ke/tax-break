import { calculateSlabTax } from './slabTax';
import {
  IrelandFilingStatus,
  IrelandPensionAgeBand,
  IrelandTaxCalculationInput,
  InternationalTaxResult,
  SlabBracket,
} from '../types';

/** 2025 standard rate cut-off points by personal circumstances. */
const STANDARD_RATE_CUT_OFF: Record<IrelandFilingStatus, number> = {
  single: 44000,
  singleParent: 48000,
  marriedOneIncome: 53000,
  marriedTwoIncomes: 53000,
};

/**
 * Maximum extension of the jointly assessed cut-off point by the lower earner's income
 * (EUR 53,000 + up to EUR 35,000 = EUR 88,000 in 2025).
 */
const MARRIED_CUT_OFF_EXTENSION_CAP = 35000;

/** 2025 personal tax credits by personal circumstances (single person child carer credit included). */
const PERSONAL_TAX_CREDIT: Record<IrelandFilingStatus, number> = {
  single: 2000,
  singleParent: 3900,
  marriedOneIncome: 4000,
  marriedTwoIncomes: 4000,
};

/** 2025 employee (PAYE) tax credit, available per employed spouse. */
const EMPLOYEE_TAX_CREDIT = 2000;

/** Age-related percentage limits on pension contribution relief. */
const PENSION_RELIEF_LIMIT: Record<IrelandPensionAgeBand, number> = {
  under30: 0.15,
  '30to39': 0.2,
  '40to49': 0.25,
  '50to54': 0.3,
  '55to59': 0.35,
  '60plus': 0.4,
};

/** Earnings cap for pension contribution relief. */
const PENSION_EARNINGS_CAP = 115000;

/** 2025 USC bands. USC is charged on gross income without relief for pension contributions. */
const USC_BANDS: SlabBracket[] = [
  { from: 0, to: 12012, rate: 0.005 },
  { from: 12012, to: 27382, rate: 0.02 },
  { from: 27382, to: 70044, rate: 0.03 },
  { from: 70044, to: null, rate: 0.08 },
];

/** Total income at or below this amount is exempt from USC. */
const USC_EXEMPTION_THRESHOLD = 13000;

/** Class A employee PRSI rate applying for 2025. */
const PRSI_RATE = 0.041;

/** Weekly earnings at or below this amount are exempt from employee PRSI (EUR 352 per week). */
const PRSI_ANNUAL_EXEMPTION = 352 * 52;

/** Capital gains tax rate and annual personal exemption. */
const CGT_RATE = 0.33;
const CGT_ANNUAL_EXEMPTION = 1270;

/** Relief rate for qualifying non-routine medical expenses. */
const MEDICAL_EXPENSES_RELIEF_RATE = 0.2;

/** Rent tax credit: 20% of rent paid, capped at EUR 1,000 (EUR 2,000 for a jointly assessed couple). */
const RENT_CREDIT_RATE = 0.2;
const RENT_CREDIT_CAP_SINGLE = 1000;
const RENT_CREDIT_CAP_JOINT = 2000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

function isJointlyAssessed(status: IrelandFilingStatus): boolean {
  return status === 'marriedOneIncome' || status === 'marriedTwoIncomes';
}

/** Standard rate cut-off point, extended by the lower earner's income when jointly assessed. */
export function irelandStandardRateCutOff(
  status: IrelandFilingStatus,
  spouseIncome: number,
): number {
  const base = STANDARD_RATE_CUT_OFF[status];
  if (status !== 'marriedTwoIncomes') return base;
  return base + Math.min(spouseIncome, MARRIED_CUT_OFF_EXTENSION_CAP);
}

/** Pension contributions relieved, after the age-related percentage and earnings cap. */
export function irelandPensionRelief(
  contributions: number,
  earnings: number,
  ageBand: IrelandPensionAgeBand,
): number {
  const relievableEarnings = Math.min(earnings, PENSION_EARNINGS_CAP);
  return Math.min(contributions, PENSION_RELIEF_LIMIT[ageBand] * relievableEarnings);
}

/** Universal Social Charge on gross income for a taxpayer under 70 with no medical card. */
export function irelandUsc(grossIncome: number): number {
  if (grossIncome <= USC_EXEMPTION_THRESHOLD) return 0;
  return round2(calculateSlabTax(grossIncome, USC_BANDS));
}

/** Class A employee PRSI on gross income. */
export function irelandPrsi(grossIncome: number): number {
  if (grossIncome <= PRSI_ANNUAL_EXEMPTION) return 0;
  return round2(grossIncome * PRSI_RATE);
}

/**
 * Estimates the Irish tax liability of a PAYE employee for 2025, including salary, bonus, benefits
 * in kind, share awards vesting, other income, pension relief, USC, PRSI and capital gains tax on
 * shares sold.
 */
export function calculateIrelandTax(input: IrelandTaxCalculationInput): InternationalTaxResult {
  const filingStatus = input.filingStatus ?? 'single';
  const spouseIncome = positive(input.spouseIncome);
  const salary = positive(input.annualIncome);
  const bonus = positive(input.bonus);
  const taxableBenefits = positive(input.taxableBenefits);
  const shareVestingIncome = positive(input.shares?.rsuVestedValue);
  const otherIncome = positive(input.otherIncome);

  const employmentIncome = salary + bonus + taxableBenefits + shareVestingIncome;
  const grossIncome = employmentIncome + otherIncome;

  const pensionRelief = round2(
    irelandPensionRelief(
      positive(input.pensionContributions),
      employmentIncome,
      input.pensionAgeBand ?? 'under30',
    ),
  );
  const taxableIncome = round2(Math.max(0, grossIncome - pensionRelief));

  const standardRateCutOff = irelandStandardRateCutOff(filingStatus, spouseIncome);
  const incomeTax = round2(
    calculateSlabTax(taxableIncome, [
      { from: 0, to: standardRateCutOff, rate: 0.2 },
      { from: standardRateCutOff, to: null, rate: 0.4 },
    ]),
  );

  const employeeCredits =
    (employmentIncome > 0 ? EMPLOYEE_TAX_CREDIT : 0) +
    (filingStatus === 'marriedTwoIncomes' && spouseIncome > 0 ? EMPLOYEE_TAX_CREDIT : 0);
  const medicalExpensesRelief = positive(input.medicalExpenses) * MEDICAL_EXPENSES_RELIEF_RATE;
  const rentCredit = Math.min(
    positive(input.rentPaid) * RENT_CREDIT_RATE,
    isJointlyAssessed(filingStatus) ? RENT_CREDIT_CAP_JOINT : RENT_CREDIT_CAP_SINGLE,
  );
  const availableCredits =
    PERSONAL_TAX_CREDIT[filingStatus] + employeeCredits + medicalExpensesRelief + rentCredit;
  // Credits are non-refundable: they can reduce income tax to zero but never below it.
  const taxCredits = round2(Math.min(incomeTax, availableCredits));

  const universalSocialCharge = irelandUsc(grossIncome);
  const prsi = irelandPrsi(grossIncome);

  const capitalGain = round2(
    positive(input.shares?.shareSaleProceeds) -
      positive(input.shares?.shareSaleCost) -
      positive(input.shares?.capitalLossesForward),
  );
  const taxableCapitalGain = round2(Math.max(0, capitalGain - CGT_ANNUAL_EXEMPTION));
  const capitalGainsTax = round2(taxableCapitalGain * CGT_RATE);

  const totalTaxLiability = round2(
    incomeTax - taxCredits + universalSocialCharge + prsi + capitalGainsTax,
  );
  const totalIncomeAndGains = grossIncome + Math.max(0, capitalGain);

  return {
    country: 'ireland',
    currency: 'EUR',
    grossIncome,
    standardDeduction: 0,
    taxableIncome,
    incomeTax,
    taxCredits,
    totalTaxLiability,
    effectiveTaxRate: totalIncomeAndGains > 0 ? (totalTaxLiability / totalIncomeAndGains) * 100 : 0,
    ireland: {
      employmentIncome,
      shareVestingIncome,
      otherIncome,
      pensionRelief,
      standardRateCutOff,
      universalSocialCharge,
      prsi,
      capitalGain,
      taxableCapitalGain,
      capitalGainsTax,
      netIncome: round2(totalIncomeAndGains - totalTaxLiability),
    },
  };
}
