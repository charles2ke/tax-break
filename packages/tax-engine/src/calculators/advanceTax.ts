import { AdvanceTaxInstallment, AdvanceTaxResult, AssessmentYear } from '../types';

const INSTALLMENT_SCHEDULE: Array<{ label: string; percentage: number; dueDateSuffix: string }> = [
  { label: '1st Installment', percentage: 0.15, dueDateSuffix: '06-15' },
  { label: '2nd Installment', percentage: 0.45, dueDateSuffix: '09-15' },
  { label: '3rd Installment', percentage: 0.75, dueDateSuffix: '12-15' },
  { label: '4th Installment', percentage: 1, dueDateSuffix: '03-15' },
];

/** Minimum net tax payable (after TDS) above which advance tax obligations apply (Section 208). */
const ADVANCE_TAX_THRESHOLD = 10000;

const MONTHLY_INTEREST_RATE = 0.01;

function financialYearStart(assessmentYear: AssessmentYear): number {
  // 'FY2024-25' -> the calculation year begins in calendar year 2024.
  return Number(assessmentYear.slice(2, 6));
}

function dueDateFor(assessmentYear: AssessmentYear, suffix: string): string {
  const startYear = financialYearStart(assessmentYear);
  // The last two installments (Dec 15, Mar 15) fall in the following calendar year.
  const year = suffix.startsWith('03') ? startYear + 1 : startYear;
  return `${year}-${suffix}`;
}

/**
 * Computes the quarterly advance tax installment schedule (Section 211) and estimates interest
 * payable under Sections 234B (default in payment) and 234C (deferment of installments) for a
 * simple, non-corporate resident taxpayer. This is a simplified estimate: it assumes tax
 * liability accrues evenly and does not model presumptive-income taxpayers' single-installment
 * rule (Section 44AD/44ADA), which is out of scope here.
 */
export function calculateAdvanceTax(
  totalTaxLiability: number,
  taxAlreadyPaid: number,
  assessmentYear: AssessmentYear,
): AdvanceTaxResult {
  const netTaxPayable = Math.max(0, Math.round(totalTaxLiability - Math.max(0, taxAlreadyPaid)));
  const advanceTaxApplicable = netTaxPayable > ADVANCE_TAX_THRESHOLD;

  let previousCumulative = 0;
  const installments: AdvanceTaxInstallment[] = INSTALLMENT_SCHEDULE.map((step) => {
    const cumulativeAmountDue = Math.round(netTaxPayable * step.percentage);
    const amountDueThisInstallment = Math.max(0, cumulativeAmountDue - previousCumulative);
    previousCumulative = cumulativeAmountDue;
    return {
      label: step.label,
      dueDate: dueDateFor(assessmentYear, step.dueDateSuffix),
      cumulativePercentage: step.percentage * 100,
      cumulativeAmountDue,
      amountDueThisInstallment,
    };
  });

  if (!advanceTaxApplicable) {
    return {
      totalTaxLiability,
      taxAlreadyPaid,
      netTaxPayable,
      advanceTaxApplicable,
      installments: installments.map((installment) => ({
        ...installment,
        amountDueThisInstallment: 0,
        cumulativeAmountDue: 0,
      })),
      interestSection234B: 0,
      interestSection234C: 0,
      totalInterest: 0,
    };
  }

  // Section 234C: shortfall against each cumulative installment requirement attracts 1% per
  // month simple interest for 3 months (1 month for the final installment), assuming the whole
  // shortfall is paid at the fiscal year end (a conservative/simplified estimate).
  const interestSection234C = installments.reduce((total, installment, index) => {
    const shortfall = installment.cumulativeAmountDue;
    const months = index === installments.length - 1 ? 1 : 3;
    return total + shortfall * MONTHLY_INTEREST_RATE * months;
  }, 0);

  // Section 234B: 1% per month simple interest on the unpaid tax from April of the assessment
  // year until the (assumed) self-assessment payment date; estimated here as 1 month if
  // advance tax paid is below 90% of the total liability, a common simplification.
  const advanceTaxPaidEstimate = taxAlreadyPaid;
  const ninetyPercentThreshold = totalTaxLiability * 0.9;
  const interestSection234B =
    advanceTaxPaidEstimate < ninetyPercentThreshold
      ? Math.max(0, totalTaxLiability - advanceTaxPaidEstimate) * MONTHLY_INTEREST_RATE
      : 0;

  const totalInterest = Math.round(interestSection234B + interestSection234C);

  return {
    totalTaxLiability,
    taxAlreadyPaid,
    netTaxPayable,
    advanceTaxApplicable,
    installments,
    interestSection234B: Math.round(interestSection234B),
    interestSection234C: Math.round(interestSection234C),
    totalInterest,
  };
}
