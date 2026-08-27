import { getConfig } from '../config';
import {
  DeductionsBreakdown,
  Regime,
  TaxBreakdown,
  TaxCalculationInput,
} from '../types';
import { calculateDeductions } from './deductions';
import { calculateHouseProperty } from './houseProperty';
import { calculateHraExemption } from './hra';
import { calculateRebate87A } from './rebate';
import { calculateSlabTax } from './slabTax';
import { calculateSurcharge } from './surcharge';

function calculateGrossIncome(
  input: TaxCalculationInput,
  homeLoanInterestCap: number,
  regime: Regime,
): { grossTotalIncome: number } {
  let salaryIncome = 0;
  if (input.salary) {
    const { basic, hraReceived, rentPaid, cityType, lta, specialAllowance, otherTaxableAllowances } =
      input.salary;
    // HRA exemption under Section 10(13A) is only available under the Old Regime; the entire
    // HRA received is taxable under the New Regime.
    const taxableHra =
      regime === 'old' ? calculateHraExemption(basic, hraReceived, rentPaid, cityType).taxableHra : Math.max(0, hraReceived);
    salaryIncome =
      Math.max(0, basic) +
      taxableHra +
      Math.max(0, lta) +
      Math.max(0, specialAllowance) +
      Math.max(0, otherTaxableAllowances ?? 0);
  }

  // Interest deduction on a self-occupied house property (Section 24(b)) is disallowed under
  // the New Regime; a let-out property's interest deduction remains available under both regimes.
  const houseProperty = calculateHouseProperty(
    regime === 'new' && input.houseProperty?.type === 'self-occupied'
      ? undefined
      : input.houseProperty,
    homeLoanInterestCap,
  );

  const otherIncome = input.otherIncome;
  const otherIncomeTotal =
    Math.max(0, otherIncome?.savingsInterest ?? 0) +
    Math.max(0, otherIncome?.otherInterest ?? 0) +
    Math.max(0, otherIncome?.dividendIncome ?? 0) +
    Math.max(0, otherIncome?.otherIncome ?? 0);

  const grossTotalIncome = salaryIncome + houseProperty.incomeFromHouseProperty + otherIncomeTotal;

  return { grossTotalIncome };
}

/**
 * Computes a full tax breakdown for a single regime.
 */
export function calculateTaxForRegime(input: TaxCalculationInput, regime: Regime): TaxBreakdown {
  const config = getConfig(input.assessmentYear);
  const regimeConfig = config[regime];

  const { grossTotalIncome } = calculateGrossIncome(
    input,
    config.homeLoanInterestCap.selfOccupied,
    regime,
  );

  const deductionsBreakdown: DeductionsBreakdown = calculateDeductions(
    regime,
    input.ageCategory,
    config,
    input.deductions,
    input.otherIncome,
    regimeConfig.standardDeduction,
  );

  const taxableIncome = Math.max(0, grossTotalIncome - deductionsBreakdown.total);

  const slabs = regimeConfig.slabs[input.ageCategory];
  const taxBeforeRebate = calculateSlabTax(taxableIncome, slabs);

  const rebate = calculateRebate87A(taxableIncome, taxBeforeRebate, regimeConfig.rebate87A);
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);

  const { surcharge, marginalRelief } = calculateSurcharge(
    taxableIncome,
    taxAfterRebate,
    regimeConfig.surchargeSlabs,
    slabs,
  );

  const taxPlusSurcharge = taxAfterRebate + surcharge;
  const cess = taxPlusSurcharge * regimeConfig.cessRate;
  const totalTaxLiability = Math.round(taxPlusSurcharge + cess);

  const effectiveTaxRate = grossTotalIncome > 0 ? (totalTaxLiability / grossTotalIncome) * 100 : 0;

  return {
    regime,
    grossTotalIncome,
    totalDeductions: deductionsBreakdown.total,
    deductionsBreakdown,
    taxableIncome,
    taxBeforeRebate,
    rebate,
    taxAfterRebate,
    surcharge,
    marginalRelief,
    cess,
    totalTaxLiability,
    effectiveTaxRate,
  };
}
