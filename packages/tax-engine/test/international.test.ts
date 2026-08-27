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

  it('ignores the state field for non-US countries', () => {
    const result = calculateInternationalTax({ country: 'uk', annualIncome: 50000, state: 'CA' });
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
});
