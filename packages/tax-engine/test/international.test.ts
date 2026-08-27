import { describe, expect, it } from 'vitest';
import { calculateInternationalTax } from '../src/calculators/international';

describe('calculateInternationalTax', () => {
  it('calculates US federal income tax after the single standard deduction', () => {
    const result = calculateInternationalTax({ country: 'us', annualIncome: 100000 });
    expect(result.currency).toBe('USD');
    expect(result.standardDeduction).toBe(15000);
    expect(result.totalTaxLiability).toBe(13614);
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
