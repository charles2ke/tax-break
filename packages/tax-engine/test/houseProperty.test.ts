import { describe, expect, it } from 'vitest';
import { calculateHouseProperty } from '../src/calculators/houseProperty';

describe('calculateHouseProperty', () => {
  it('returns all zeros when no house property input is provided', () => {
    const result = calculateHouseProperty(undefined, 200000);
    expect(result.incomeFromHouseProperty).toBe(0);
  });

  it('caps interest deduction for self-occupied property at the applicable cap', () => {
    const result = calculateHouseProperty(
      { type: 'self-occupied', homeLoanInterest: 250000 },
      200000,
    );
    expect(result.interestDeduction).toBe(200000);
    expect(result.incomeFromHouseProperty).toBe(-200000);
  });

  it('does not cap interest deduction below the actual interest paid for self-occupied', () => {
    const result = calculateHouseProperty(
      { type: 'self-occupied', homeLoanInterest: 150000 },
      200000,
    );
    expect(result.interestDeduction).toBe(150000);
    expect(result.incomeFromHouseProperty).toBe(-150000);
  });

  it('computes let-out property income with 30% standard deduction and uncapped interest', () => {
    const result = calculateHouseProperty(
      {
        type: 'let-out',
        annualRentReceived: 300000,
        municipalTaxesPaid: 20000,
        homeLoanInterest: 250000,
      },
      200000,
    );
    expect(result.netAnnualValue).toBe(280000);
    expect(result.standardDeductionOnNav).toBeCloseTo(84000);
    expect(result.interestDeduction).toBe(250000);
    expect(result.incomeFromHouseProperty).toBeCloseTo(-54000);
  });

  it('allows let-out property income to be a loss without any cap on interest', () => {
    const result = calculateHouseProperty(
      { type: 'let-out', annualRentReceived: 120000, municipalTaxesPaid: 0, homeLoanInterest: 400000 },
      200000,
    );
    expect(result.incomeFromHouseProperty).toBeCloseTo(120000 * 0.7 - 400000);
  });
});
