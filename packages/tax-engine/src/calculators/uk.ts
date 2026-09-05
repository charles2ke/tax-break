import { InternationalTaxResult, UkStudentLoanPlan, UkTaxCalculationInput } from '../types';

/** 2025/26 personal allowance and the income at which it starts to taper away. */
const PERSONAL_ALLOWANCE = 12570;
const ALLOWANCE_TAPER_THRESHOLD = 100000;

/** 2025/26 rate bands, measured on taxable income (income after the personal allowance). */
const BASIC_RATE_LIMIT = 37700;
const HIGHER_RATE_LIMIT = 125140;

const BASIC_RATE = 0.2;
const HIGHER_RATE = 0.4;
const ADDITIONAL_RATE = 0.45;

const DIVIDEND_BASIC_RATE = 0.0875;
const DIVIDEND_HIGHER_RATE = 0.3375;
const DIVIDEND_ADDITIONAL_RATE = 0.3935;

/** 0% band for savings interest, withdrawn £1 for £1 by non-savings income above the allowance. */
const STARTING_RATE_FOR_SAVINGS = 5000;

/** Personal savings allowance by highest tax rate, and the dividend allowance. */
const PSA_BASIC_RATE_TAXPAYER = 1000;
const PSA_HIGHER_RATE_TAXPAYER = 500;
const DIVIDEND_ALLOWANCE = 500;

/** Class 1 employee National Insurance for 2025/26. */
const NI_PRIMARY_THRESHOLD = 12570;
const NI_UPPER_EARNINGS_LIMIT = 50270;
const NI_MAIN_RATE = 0.08;
const NI_UPPER_RATE = 0.02;

/** Student loan repayment thresholds and rates for 2025/26. */
const STUDENT_LOAN_PLANS: Record<
  Exclude<UkStudentLoanPlan, 'none'>,
  { threshold: number; rate: number }
> = {
  plan1: { threshold: 26065, rate: 0.09 },
  plan2: { threshold: 28470, rate: 0.09 },
  plan4: { threshold: 32745, rate: 0.09 },
  plan5: { threshold: 25000, rate: 0.09 },
  postgraduate: { threshold: 21000, rate: 0.06 },
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

/** Personal allowance after the £1 for every £2 taper above £100,000 of adjusted net income. */
export function ukPersonalAllowance(adjustedNetIncome: number): number {
  if (adjustedNetIncome <= ALLOWANCE_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  return Math.max(0, PERSONAL_ALLOWANCE - (adjustedNetIncome - ALLOWANCE_TAPER_THRESHOLD) / 2);
}

/** Class 1 employee National Insurance on salary and bonus. */
export function ukNationalInsurance(employmentEarnings: number): number {
  const earnings = Math.max(0, employmentEarnings);
  const mainBand = Math.max(0, Math.min(earnings, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD);
  const upperBand = Math.max(0, earnings - NI_UPPER_EARNINGS_LIMIT);
  return round2(mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE);
}

/** Annual student loan repayment deducted from earnings above the plan threshold. */
export function ukStudentLoanRepayment(income: number, plan: UkStudentLoanPlan): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = STUDENT_LOAN_PLANS[plan];
  return Math.round(Math.max(0, income - threshold) * rate);
}

/**
 * Taxes a slice of income across the rate bands, starting from the amount of the bands already
 * used by income taxed earlier in the statutory order (non-savings, then savings, then dividends).
 */
function taxSlice(
  amount: number,
  bandsUsed: number,
  basicRateLimit: number,
  higherRateLimit: number,
  rates: { basic: number; higher: number; additional: number },
): number {
  const start = bandsUsed;
  const end = bandsUsed + amount;
  const inBand = (from: number, to: number | null) =>
    Math.max(0, Math.min(end, to ?? Infinity) - Math.max(start, from));
  return (
    inBand(0, basicRateLimit) * rates.basic +
    inBand(basicRateLimit, higherRateLimit) * rates.higher +
    inBand(higherRateLimit, null) * rates.additional
  );
}

/**
 * Estimates the UK income tax, National Insurance and student loan repayments of an England,
 * Wales or Northern Ireland resident for 2025/26. Savings interest and dividends are stacked on
 * top of non-savings income in the statutory order and keep their own 0% allowances.
 */
export function calculateUkTax(input: UkTaxCalculationInput): InternationalTaxResult {
  const salary = positive(input.annualIncome);
  const bonus = positive(input.bonus);
  const taxableBenefits = positive(input.taxableBenefits);
  const employmentIncome = salary + bonus + taxableBenefits;
  const otherNonSavingsIncome = positive(input.selfEmploymentIncome) + positive(input.rentalIncome);
  const savingsInterest = positive(input.savingsInterest);
  const dividendIncome = positive(input.dividendIncome);
  const giftAidDonations = positive(input.giftAidDonations);
  const studentLoanPlan = input.studentLoanPlan ?? 'none';

  const grossIncome = round2(
    employmentIncome + otherNonSavingsIncome + savingsInterest + dividendIncome,
  );

  // Pension contributions are relieved against non-savings income first.
  const nonSavingsBeforeRelief = employmentIncome + otherNonSavingsIncome;
  const pensionRelief = Math.min(positive(input.pensionContributions), nonSavingsBeforeRelief);
  const nonSavingsIncome = round2(nonSavingsBeforeRelief - pensionRelief);

  const adjustedNetIncome = round2(Math.max(0, grossIncome - pensionRelief - giftAidDonations));
  const personalAllowance = round2(ukPersonalAllowance(adjustedNetIncome));

  // The allowance is set against non-savings income first, then savings, then dividends.
  const allowanceOnNonSavings = Math.min(personalAllowance, nonSavingsIncome);
  const allowanceOnSavings = Math.min(personalAllowance - allowanceOnNonSavings, savingsInterest);
  const allowanceOnDividends = Math.min(
    personalAllowance - allowanceOnNonSavings - allowanceOnSavings,
    dividendIncome,
  );

  const taxableNonSavings = round2(nonSavingsIncome - allowanceOnNonSavings);
  const taxableSavings = round2(savingsInterest - allowanceOnSavings);
  const taxableDividends = round2(dividendIncome - allowanceOnDividends);
  const taxableIncome = round2(taxableNonSavings + taxableSavings + taxableDividends);

  // Gift Aid donations extend the basic and higher rate bands by the gross donation.
  const basicRateLimit = BASIC_RATE_LIMIT + giftAidDonations;
  const higherRateLimit = HIGHER_RATE_LIMIT + giftAidDonations;

  const nonSavingsTax = round2(
    taxSlice(taxableNonSavings, 0, basicRateLimit, higherRateLimit, {
      basic: BASIC_RATE,
      higher: HIGHER_RATE,
      additional: ADDITIONAL_RATE,
    }),
  );

  // The starting rate for savings is reduced £1 for £1 by non-savings income above the allowance.
  const startingRateForSavings = Math.max(
    0,
    Math.min(STARTING_RATE_FOR_SAVINGS, STARTING_RATE_FOR_SAVINGS - taxableNonSavings),
  );
  const personalSavingsAllowance =
    taxableIncome <= basicRateLimit
      ? PSA_BASIC_RATE_TAXPAYER
      : taxableIncome <= higherRateLimit
        ? PSA_HIGHER_RATE_TAXPAYER
        : 0;
  const savingsAtZeroRate = Math.min(
    taxableSavings,
    startingRateForSavings + personalSavingsAllowance,
  );
  const savingsTax = round2(
    taxSlice(
      taxableSavings - savingsAtZeroRate,
      taxableNonSavings + savingsAtZeroRate,
      basicRateLimit,
      higherRateLimit,
      { basic: BASIC_RATE, higher: HIGHER_RATE, additional: ADDITIONAL_RATE },
    ),
  );

  const dividendAllowance = Math.min(DIVIDEND_ALLOWANCE, taxableDividends);
  const dividendTax = round2(
    taxSlice(
      taxableDividends - dividendAllowance,
      taxableNonSavings + taxableSavings + dividendAllowance,
      basicRateLimit,
      higherRateLimit,
      {
        basic: DIVIDEND_BASIC_RATE,
        higher: DIVIDEND_HIGHER_RATE,
        additional: DIVIDEND_ADDITIONAL_RATE,
      },
    ),
  );

  const incomeTax = round2(nonSavingsTax + savingsTax + dividendTax);
  // National Insurance is due on salary and bonus; benefits in kind are charged to the employer.
  const nationalInsurance = ukNationalInsurance(salary + bonus);
  const studentLoanRepayment = ukStudentLoanRepayment(
    employmentIncome + otherNonSavingsIncome,
    studentLoanPlan,
  );

  const totalTaxLiability = round2(incomeTax + nationalInsurance + studentLoanRepayment);

  return {
    country: 'uk',
    currency: 'GBP',
    grossIncome,
    standardDeduction: personalAllowance,
    taxableIncome,
    incomeTax,
    taxCredits: 0,
    totalTaxLiability,
    effectiveTaxRate: grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0,
    uk: {
      employmentIncome,
      otherNonSavingsIncome,
      savingsInterest,
      dividendIncome,
      pensionRelief,
      giftAidDonations,
      adjustedNetIncome,
      personalAllowance,
      startingRateForSavings,
      personalSavingsAllowance,
      dividendAllowance,
      basicRateLimit,
      nonSavingsTax,
      savingsTax,
      dividendTax,
      nationalInsurance,
      studentLoanRepayment,
      netIncome: round2(grossIncome - totalTaxLiability),
    },
  };
}
