import { calculateSlabTax } from './slabTax';
import {
  InternationalTaxResult,
  SingaporeAgeBand,
  SingaporeTaxCalculationInput,
  SlabBracket,
} from '../types';

/** Resident individual rates for Year of Assessment 2025 (income earned in 2024 onwards). */
const RESIDENT_SLABS: SlabBracket[] = [
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
  { from: 320000, to: 500000, rate: 0.22 },
  { from: 500000, to: 1000000, rate: 0.23 },
  { from: 1000000, to: null, rate: 0.24 },
];

/** Earned income relief by age band, limited to your earned income. */
const EARNED_INCOME_RELIEF: Record<SingaporeAgeBand, number> = {
  below55: 1000,
  '55to59': 6000,
  '60plus': 8000,
};

/** Approved donations attract a 250% tax deduction. */
const DONATION_DEDUCTION_RATE = 2.5;

/** Fixed relief amounts. */
const SPOUSE_RELIEF = 2000;
const QUALIFYING_CHILD_RELIEF = 4000;
const PARENT_RELIEF = 9000;
const NSMAN_RELIEF = 3000;
const COURSE_FEES_RELIEF_CAP = 5500;
const SRS_RELIEF_CAP = 15300;
const CPF_CASH_TOP_UP_CAP = 16000;

/** Life insurance relief is only available when CPF contributions are below $5,000. */
const LIFE_INSURANCE_CPF_LIMIT = 5000;
const LIFE_INSURANCE_RELIEF_CAP = 5000;

/** Total personal reliefs are capped at $80,000 per year of assessment. */
const PERSONAL_RELIEF_CAP = 80000;

/** YA 2025 personal income tax rebate: 60% of tax payable, capped at $200. */
const TAX_REBATE_RATE = 0.6;
const TAX_REBATE_CAP = 200;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

/** Earned income relief, limited to the earned income actually assessed. */
export function singaporeEarnedIncomeRelief(earnedIncome: number, ageBand: SingaporeAgeBand): number {
  return Math.min(Math.max(0, earnedIncome), EARNED_INCOME_RELIEF[ageBand]);
}

/** Life insurance relief, available only when CPF contributions are below $5,000. */
export function singaporeLifeInsuranceRelief(premiums: number, cpfContributions: number): number {
  if (cpfContributions >= LIFE_INSURANCE_CPF_LIMIT) return 0;
  return Math.min(
    Math.max(0, premiums),
    LIFE_INSURANCE_RELIEF_CAP - Math.max(0, cpfContributions),
    LIFE_INSURANCE_RELIEF_CAP,
  );
}

/**
 * Estimates the Singapore income tax of a tax resident for Year of Assessment 2025, covering
 * employment income, director's fees, benefits in kind, rental and other income, employment
 * expenses, approved donations, personal reliefs (subject to the $80,000 cap) and the personal
 * income tax rebate.
 */
export function calculateSingaporeTax(
  input: SingaporeTaxCalculationInput,
): InternationalTaxResult {
  const salary = positive(input.annualIncome);
  const bonus = positive(input.bonus);
  const directorsFees = positive(input.directorsFees);
  const taxableBenefits = positive(input.taxableBenefits);
  const rentalIncome = positive(input.rentalIncome);
  const tradeIncome = positive(input.otherIncome);
  const ageBand = input.ageBand ?? 'below55';
  const reliefs = input.reliefs ?? {};

  const employmentIncome = round2(salary + bonus + directorsFees + taxableBenefits);
  const otherIncome = round2(rentalIncome + tradeIncome);
  const grossIncome = round2(employmentIncome + otherIncome);

  const employmentExpenses = Math.min(positive(input.employmentExpenses), employmentIncome);
  const donationDeduction = round2(positive(input.approvedDonations) * DONATION_DEDUCTION_RATE);
  const assessableIncome = round2(
    Math.max(0, grossIncome - employmentExpenses - donationDeduction),
  );

  const earnedIncome = employmentIncome - employmentExpenses + tradeIncome;
  const earnedIncomeRelief = singaporeEarnedIncomeRelief(earnedIncome, ageBand);

  const cpfContributions = positive(reliefs.cpfContributions);
  const cpfAndSrsRelief = round2(
    cpfContributions +
      Math.min(positive(reliefs.cpfCashTopUp), CPF_CASH_TOP_UP_CAP) +
      Math.min(positive(reliefs.srsContributions), SRS_RELIEF_CAP),
  );

  const familyRelief = round2(
    (reliefs.spouseRelief ? SPOUSE_RELIEF : 0) +
      positive(reliefs.qualifyingChildren) * QUALIFYING_CHILD_RELIEF +
      positive(reliefs.dependantParents) * PARENT_RELIEF,
  );

  const otherRelief = round2(
    (reliefs.nsmanRelief ? NSMAN_RELIEF : 0) +
      Math.min(positive(reliefs.courseFees), COURSE_FEES_RELIEF_CAP) +
      singaporeLifeInsuranceRelief(positive(reliefs.lifeInsurancePremiums), cpfContributions) +
      positive(reliefs.foreignMaidLevy),
  );

  const totalReliefsBeforeCap = round2(
    earnedIncomeRelief + cpfAndSrsRelief + familyRelief + otherRelief,
  );
  const totalReliefsAllowed = Math.min(totalReliefsBeforeCap, PERSONAL_RELIEF_CAP);

  const chargeableIncome = round2(Math.max(0, assessableIncome - totalReliefsAllowed));
  const incomeTax = round2(calculateSlabTax(chargeableIncome, RESIDENT_SLABS));
  const taxRebate = round2(Math.min(incomeTax * TAX_REBATE_RATE, TAX_REBATE_CAP));
  const totalTaxLiability = round2(incomeTax - taxRebate);

  return {
    country: 'singapore',
    currency: 'SGD',
    grossIncome,
    standardDeduction: totalReliefsAllowed,
    taxableIncome: chargeableIncome,
    incomeTax,
    taxCredits: taxRebate,
    totalTaxLiability,
    effectiveTaxRate: grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0,
    singapore: {
      employmentIncome,
      otherIncome,
      employmentExpenses,
      donationDeduction,
      assessableIncome,
      earnedIncomeRelief,
      cpfAndSrsRelief,
      familyRelief,
      otherRelief,
      totalReliefsBeforeCap,
      totalReliefsAllowed,
      chargeableIncome,
      taxRebate,
      netIncome: round2(grossIncome - totalTaxLiability),
    },
  };
}
