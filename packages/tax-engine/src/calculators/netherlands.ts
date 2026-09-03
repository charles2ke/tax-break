import { calculateSlabTax } from './slabTax';
import { InternationalTaxResult, NetherlandsTaxCalculationInput, SlabBracket } from '../types';

/**
 * 2025 Box 1 (work and home) rates for taxpayers below the AOW (state pension) age. The first two
 * brackets include national social-security contributions.
 */
const BOX1_BRACKETS: SlabBracket[] = [
  { from: 0, to: 38441, rate: 0.3582 },
  { from: 38441, to: 76817, rate: 0.3748 },
  { from: 76817, to: null, rate: 0.495 },
];

/** Income above which Box 1 income is taxed at the top rate. */
const TOP_BRACKET_THRESHOLD = 76817;
const TOP_RATE = 0.495;

/**
 * Deductible items such as mortgage interest and personal deductions are only relieved at the
 * second-bracket rate of 37.48% in 2025 (tariefsaanpassing aftrekposten).
 */
const MAX_DEDUCTION_RELIEF_RATE = 0.3748;

/** The 30% ruling exempts 30% of employment income, capped by the WNT norm of EUR 246,000. */
const THIRTY_PERCENT_RULING_RATE = 0.3;
const THIRTY_PERCENT_RULING_INCOME_CAP = 246000;

/** Eigenwoningforfait: 0.35% of the WOZ value up to EUR 1,330,000, 2.35% on the excess. */
const EWF_RATE = 0.0035;
const EWF_HIGH_VALUE_THRESHOLD = 1330000;
const EWF_HIGH_VALUE_RATE = 0.0235;

/** 2025 Box 2 (substantial interest) brackets. */
const BOX2_BRACKETS: SlabBracket[] = [
  { from: 0, to: 67804, rate: 0.245 },
  { from: 67804, to: null, rate: 0.31 },
];

/** 2025 Box 3 deemed return percentages, tax-free allowance, debt threshold and flat rate. */
const BOX3_SAVINGS_RETURN = 0.0144;
const BOX3_INVESTMENT_RETURN = 0.0588;
const BOX3_DEBT_RETURN = 0.0262;
const BOX3_TAX_FREE_ALLOWANCE = 57684;
const BOX3_DEBT_THRESHOLD = 3800;
const BOX3_RATE = 0.36;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

/**
 * Dutch general tax credit (algemene heffingskorting) for taxpayers below the AOW age, 2025
 * amounts: EUR 3,068 up to EUR 28,406 of income, then tapered at 6.337% and fully phased out from
 * EUR 76,817.
 */
export function dutchGeneralTaxCredit(income: number): number {
  if (income <= 28406) return 3068;
  if (income >= 76817) return 0;
  return Math.max(0, 3068 - 0.06337 * (income - 28406));
}

/**
 * Dutch labour tax credit (arbeidskorting) for taxpayers below the AOW age, 2025 amounts, computed
 * on employment income (arbeidsinkomen).
 */
export function dutchLabourTaxCredit(income: number): number {
  if (income <= 12169) return 0.08053 * income;
  if (income <= 26288) return 980 + 0.3003 * (income - 12169);
  if (income <= 43071) return 5220 + 0.02258 * (income - 26288);
  if (income >= 129078) return 0;
  return Math.max(0, 5599 - 0.0651 * (income - 43071));
}

/** Employment income exempted by the 30% ruling, capped by the WNT norm. */
export function dutchThirtyPercentExemption(employmentIncome: number): number {
  return THIRTY_PERCENT_RULING_RATE * Math.min(employmentIncome, THIRTY_PERCENT_RULING_INCOME_CAP);
}

/** Notional rental value of an owner-occupied home added to Box 1 income. */
export function dutchEigenwoningforfait(wozValue: number): number {
  const value = Math.max(0, wozValue);
  if (value <= EWF_HIGH_VALUE_THRESHOLD) return round2(value * EWF_RATE);
  return round2(
    EWF_HIGH_VALUE_THRESHOLD * EWF_RATE + (value - EWF_HIGH_VALUE_THRESHOLD) * EWF_HIGH_VALUE_RATE,
  );
}

/** Box 3 tax on the deemed return from savings, investments and debts. */
export function dutchBox3Tax(
  savings: number,
  investments: number,
  debts: number,
  fiscalPartner: boolean,
): { assets: number; taxFreeAllowance: number; deemedReturn: number; tax: number } {
  const debtThreshold = fiscalPartner ? BOX3_DEBT_THRESHOLD * 2 : BOX3_DEBT_THRESHOLD;
  const deductibleDebts = Math.max(0, debts - debtThreshold);
  const assets = round2(savings + investments - deductibleDebts);
  const taxFreeAllowance = fiscalPartner ? BOX3_TAX_FREE_ALLOWANCE * 2 : BOX3_TAX_FREE_ALLOWANCE;

  if (assets <= taxFreeAllowance) {
    return { assets, taxFreeAllowance, deemedReturn: 0, tax: 0 };
  }

  const grossReturn =
    savings * BOX3_SAVINGS_RETURN +
    investments * BOX3_INVESTMENT_RETURN -
    deductibleDebts * BOX3_DEBT_RETURN;
  // Only the share of the deemed return relating to assets above the tax-free allowance is taxed.
  const taxableShare = (assets - taxFreeAllowance) / assets;
  const deemedReturn = round2(Math.max(0, grossReturn * taxableShare));

  return { assets, taxFreeAllowance, deemedReturn, tax: round2(deemedReturn * BOX3_RATE) };
}

/**
 * Estimates the Dutch tax liability of a resident individual below the AOW age for 2025, covering
 * Box 1 employment and other income (including the 30% ruling, pension contributions and the
 * owner-occupied home), Box 2 substantial-interest income, Box 3 savings and investments, and the
 * general and labour tax credits.
 */
export function calculateNetherlandsTax(
  input: NetherlandsTaxCalculationInput,
): InternationalTaxResult {
  const salary = positive(input.annualIncome);
  const holidayAllowance = positive(input.holidayAllowance);
  const bonus = positive(input.bonus);
  const taxableBenefits = positive(input.taxableBenefits);
  const otherIncome = positive(input.otherIncome);
  const fiscalPartner = input.fiscalPartner ?? false;

  const employmentIncome = salary + holidayAllowance + bonus + taxableBenefits;
  const thirtyPercentExemption = input.thirtyPercentRuling
    ? round2(dutchThirtyPercentExemption(employmentIncome))
    : 0;
  const taxableEmploymentIncome = round2(employmentIncome - thirtyPercentExemption);

  const pensionDeduction = Math.min(positive(input.pensionContributions), taxableEmploymentIncome);
  const eigenwoningforfait = dutchEigenwoningforfait(positive(input.home?.wozValue));
  const mortgageInterestDeduction = positive(input.home?.mortgageInterest);
  const otherDeductions = positive(input.otherDeductions);

  const incomeBeforeDeductions = round2(taxableEmploymentIncome + otherIncome + eigenwoningforfait);
  // Deductions relieved at the capped rate; pension contributions are not subject to the cap.
  const rateLimitedDeductions = mortgageInterestDeduction + otherDeductions;
  const box1Income = round2(
    Math.max(0, incomeBeforeDeductions - pensionDeduction - rateLimitedDeductions),
  );

  const bracketTax = calculateSlabTax(box1Income, BOX1_BRACKETS);
  // The part of the capped deductions that would otherwise be relieved at the top rate is only
  // relieved at 37.48%, so the difference is added back to the tax due.
  const deductionsRelievedAtTopRate = Math.max(
    0,
    Math.min(
      rateLimitedDeductions,
      incomeBeforeDeductions - pensionDeduction - TOP_BRACKET_THRESHOLD,
    ),
  );
  const deductionRateAdjustment = round2(
    deductionsRelievedAtTopRate * (TOP_RATE - MAX_DEDUCTION_RELIEF_RATE),
  );
  const box1Tax = round2(bracketTax + deductionRateAdjustment);

  const box2Income = positive(input.box2Income);
  const box2Tax = round2(calculateSlabTax(box2Income, BOX2_BRACKETS));

  const box3 = dutchBox3Tax(
    positive(input.box3?.savings),
    positive(input.box3?.investments),
    positive(input.box3?.debts),
    fiscalPartner,
  );

  const incomeTax = round2(box1Tax + box2Tax + box3.tax);

  const generalTaxCredit = round2(
    dutchGeneralTaxCredit(box1Income + box2Income + box3.deemedReturn),
  );
  const labourTaxCredit = round2(dutchLabourTaxCredit(taxableEmploymentIncome - pensionDeduction));
  // Credits are non-refundable: they can reduce the liability to zero but never below it.
  const taxCredits = round2(Math.min(incomeTax, generalTaxCredit + labourTaxCredit));

  const totalTaxLiability = round2(incomeTax - taxCredits);
  const grossIncome = round2(employmentIncome + otherIncome + box2Income);

  return {
    country: 'netherlands',
    currency: 'EUR',
    grossIncome,
    standardDeduction: 0,
    taxableIncome: box1Income,
    incomeTax,
    taxCredits,
    totalTaxLiability,
    effectiveTaxRate: grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0,
    netherlands: {
      employmentIncome,
      thirtyPercentExemption,
      taxableEmploymentIncome,
      otherIncome,
      pensionDeduction,
      eigenwoningforfait,
      mortgageInterestDeduction,
      otherDeductions,
      deductionRateAdjustment,
      box1Income,
      box1Tax,
      generalTaxCredit,
      labourTaxCredit,
      box2Income,
      box2Tax,
      box3Assets: box3.assets,
      box3TaxFreeAllowance: box3.taxFreeAllowance,
      box3DeemedReturn: box3.deemedReturn,
      box3Tax: box3.tax,
      netIncome: round2(grossIncome - totalTaxLiability),
    },
  };
}
