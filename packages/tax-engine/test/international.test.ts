import { describe, expect, it } from 'vitest';
import { calculateInternationalTax } from '../src/calculators/international';

describe('calculateInternationalTax', () => {
  it('calculates US federal income tax after the single standard deduction', () => {
    const result = calculateInternationalTax({ country: 'us', annualIncome: 100000 });
    expect(result.currency).toBe('USD');
    expect(result.standardDeduction).toBe(15750);
    expect(result.taxableIncome).toBe(84250);
    // 11,925 @ 10% + 36,550 @ 12% + 35,775 @ 22%
    expect(result.incomeTax).toBe(13449);
    expect(result.totalTaxLiability).toBe(13449);
    expect(result.stateTax).toBeUndefined();
  });

  it('adds state income tax to the US federal liability when a state is given', () => {
    const result = calculateInternationalTax({
      country: 'us',
      annualIncome: 100000,
      state: 'CA',
    });
    // California: 100,000 - 5,706 standard deduction = 94,294 taxable.
    expect(result.stateTaxableIncome).toBe(94294);
    expect(result.stateTax).toBeCloseTo(5311.7, 2);
    expect(result.totalTaxLiability).toBeCloseTo(13449 + 5311.7, 2);
    expect(result.effectiveTaxRate).toBeCloseTo(result.totalTaxLiability / 1000, 6);
  });

  it('charges no state tax in states without an individual income tax', () => {
    const result = calculateInternationalTax({
      country: 'us',
      annualIncome: 100000,
      state: 'TX',
    });
    expect(result.stateTax).toBe(0);
    expect(result.totalTaxLiability).toBe(result.incomeTax);
  });

  it('calculates non-US countries without a state field', () => {
    const result = calculateInternationalTax({ country: 'uk', annualIncome: 50000 });
    expect(result.stateTax).toBeUndefined();
    expect(result.totalTaxLiability).toBe(7486);
  });

  it('calculates UK income tax after the personal allowance', () => {
    const result = calculateInternationalTax({ country: 'uk', annualIncome: 50000 });
    expect(result.totalTaxLiability).toBe(7486);
  });

  it.each(['ireland', 'netherlands', 'singapore'] as const)('supports %s', (country) => {
    expect(
      calculateInternationalTax({ country, annualIncome: 100000 }).totalTaxLiability,
    ).toBeGreaterThan(0);
  });

  it('applies the Dutch general and labour tax credits for a mid income', () => {
    const result = calculateInternationalTax({ country: 'netherlands', annualIncome: 45000 });
    // Box 1: 38,441 x 35.82% + 6,559 x 37.48% = 13,769.56 + 2,458.32 = 16,227.88
    expect(result.incomeTax).toBeCloseTo(16227.88, 2);
    // General credit: 3,068 - 6.337% x (45,000 - 28,406) = 2,016.44
    // Labour credit: 5,599 - 6.510% x (45,000 - 43,071) = 5,473.42
    expect(result.taxCredits).toBeCloseTo(7489.86, 2);
    expect(result.totalTaxLiability).toBeCloseTo(8738.02, 2);
    expect(result.effectiveTaxRate).toBeCloseTo(19.42, 2);
  });

  it('phases out the Dutch tax credits at high incomes', () => {
    const result = calculateInternationalTax({ country: 'netherlands', annualIncome: 150000 });
    expect(result.taxCredits).toBe(0);
    expect(result.totalTaxLiability).toBe(result.incomeTax);
  });

  it('never lets the Dutch tax credits create a refund', () => {
    const result = calculateInternationalTax({ country: 'netherlands', annualIncome: 8000 });
    expect(result.taxCredits).toBe(result.incomeTax);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('reports no tax credits for countries where they are not modelled', () => {
    expect(calculateInternationalTax({ country: 'uk', annualIncome: 50000 }).taxCredits).toBe(0);
  });
});
