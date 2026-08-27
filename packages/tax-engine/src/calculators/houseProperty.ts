import { HousePropertyInput, HousePropertyResult } from '../types';

const STANDARD_DEDUCTION_RATE = 0.3;

/**
 * Computes income (or loss) from house property.
 * Self-occupied: only home loan interest is deductible, capped at `selfOccupiedInterestCap`.
 * Let-out: net annual value (rent - municipal taxes) less 30% standard deduction and the
 * full interest paid (no cap).
 */
export function calculateHouseProperty(
  input: HousePropertyInput | undefined,
  selfOccupiedInterestCap: number,
): HousePropertyResult {
  if (!input) {
    return {
      netAnnualValue: 0,
      standardDeductionOnNav: 0,
      interestDeduction: 0,
      incomeFromHouseProperty: 0,
    };
  }

  const interest = Math.max(0, input.homeLoanInterest ?? 0);

  if (input.type === 'self-occupied') {
    const interestDeduction = Math.min(interest, selfOccupiedInterestCap);
    return {
      netAnnualValue: 0,
      standardDeductionOnNav: 0,
      interestDeduction,
      incomeFromHouseProperty: -interestDeduction,
    };
  }

  const rentReceived = Math.max(0, input.annualRentReceived ?? 0);
  const municipalTaxes = Math.max(0, input.municipalTaxesPaid ?? 0);
  const netAnnualValue = Math.max(0, rentReceived - municipalTaxes);
  const standardDeductionOnNav = netAnnualValue * STANDARD_DEDUCTION_RATE;
  const incomeFromHouseProperty = netAnnualValue - standardDeductionOnNav - interest;

  return {
    netAnnualValue,
    standardDeductionOnNav,
    interestDeduction: interest,
    incomeFromHouseProperty,
  };
}
