import { describe, expect, it } from 'vitest';
import { compareRegimes } from '../src/calculators/compare';
import { TaxCalculationInput } from '../src/types';

describe('compareRegimes', () => {
  it('recommends the new regime and reports correct savings for a simple salary case', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 800000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 100000,
      },
    };
    const result = compareRegimes(input);
    expect(result.old.totalTaxLiability).toBe(85800);
    expect(result.new.totalTaxLiability).toBe(41600);
    expect(result.recommendedRegime).toBe('new');
    expect(result.savings).toBe(85800 - 41600);
  });

  it('recommends the old regime when HRA exemption and heavy deductions make it more beneficial', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 1200000,
        hraReceived: 480000,
        rentPaid: 600000,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
      deductions: {
        section80C: 150000,
        section80CCD1B: 50000,
        section80D: { selfAndFamilyPremium: 25000 },
      },
    };
    const result = compareRegimes(input);
    // HRA exemption (Section 10(13A)) is only available under the Old Regime, so the New Regime
    // taxes the full HRA received, on top of disallowing Chapter VI-A deductions.
    expect(result.old.totalTaxLiability).toBeLessThan(result.new.totalTaxLiability);
    expect(result.recommendedRegime).toBe('old');
    expect(result.savings).toBe(result.new.totalTaxLiability - result.old.totalTaxLiability);
  });

  it('recommends the new regime for a zero-income scenario with no difference in savings', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
    };
    const result = compareRegimes(input);
    expect(result.savings).toBe(0);
    expect(result.recommendedRegime).toBe('new');
  });
});
