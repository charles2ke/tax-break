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

  it('calculates Irish income tax using the 2025 bands and PAYE tax credits', () => {
    const result = calculateInternationalTax({ country: 'ireland', annualIncome: 60000 });
    expect(result.currency).toBe('EUR');
    // 44,000 @ 20% + 16,000 @ 40% = 15,200, less 4,000 of personal + employee credits.
    expect(result.incomeTax).toBe(15200);
    expect(result.taxCredits).toBe(4000);
    expect(result.totalTaxLiability).toBe(11200);
  });

  it('never lets Irish tax credits create a refund', () => {
    const result = calculateInternationalTax({ country: 'ireland', annualIncome: 15000 });
    expect(result.incomeTax).toBe(3000);
    expect(result.taxCredits).toBe(3000);
    expect(result.totalTaxLiability).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });

  it.each(['ireland', 'netherlands', 'singapore'] as const)('supports %s', (country) => {
    expect(
      calculateInternationalTax({ country, annualIncome: 100000 }).totalTaxLiability,
    ).toBeGreaterThan(0);
  });
});
