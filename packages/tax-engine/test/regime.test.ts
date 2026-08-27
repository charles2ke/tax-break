import { describe, expect, it } from 'vitest';
import { calculateTaxForRegime } from '../src/calculators/regime';
import { TaxCalculationInput } from '../src/types';

describe('calculateTaxForRegime', () => {
  it('returns zero tax liability for no income', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
    };
    const oldResult = calculateTaxForRegime(input, 'old');
    const newResult = calculateTaxForRegime(input, 'new');
    expect(oldResult.totalTaxLiability).toBe(0);
    expect(newResult.totalTaxLiability).toBe(0);
    expect(oldResult.grossTotalIncome).toBe(0);
  });

  it('computes a salary-only case correctly for both regimes (FY2024-25, below 60)', () => {
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

    const oldResult = calculateTaxForRegime(input, 'old');
    expect(oldResult.grossTotalIncome).toBe(900000);
    expect(oldResult.taxableIncome).toBe(850000);
    expect(oldResult.taxBeforeRebate).toBeCloseTo(82500);
    expect(oldResult.rebate).toBe(0);
    expect(oldResult.cess).toBeCloseTo(3300);
    expect(oldResult.totalTaxLiability).toBe(85800);

    const newResult = calculateTaxForRegime(input, 'new');
    expect(newResult.taxableIncome).toBe(850000);
    expect(newResult.taxBeforeRebate).toBeCloseTo(40000);
    expect(newResult.rebate).toBe(0);
    expect(newResult.cess).toBeCloseTo(1600);
    expect(newResult.totalTaxLiability).toBe(41600);
  });

  it('applies HRA exemption when computing salary income', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 300000,
        hraReceived: 150000,
        rentPaid: 180000,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const oldResult = calculateTaxForRegime(input, 'old');
    // Entire HRA is exempt, so gross salary income is just the basic pay.
    expect(oldResult.grossTotalIncome).toBe(300000);
  });

  it('taxes the full HRA received under the new regime (no Section 10(13A) exemption)', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 300000,
        hraReceived: 150000,
        rentPaid: 180000,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const oldResult = calculateTaxForRegime(input, 'old');
    const newResult = calculateTaxForRegime(input, 'new');
    expect(oldResult.grossTotalIncome).toBe(300000);
    expect(newResult.grossTotalIncome).toBe(450000);
  });

  it('disallows self-occupied home loan interest deduction under the new regime', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 1000000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
      houseProperty: { type: 'self-occupied', homeLoanInterest: 200000 },
    };
    const oldResult = calculateTaxForRegime(input, 'old');
    const newResult = calculateTaxForRegime(input, 'new');
    expect(oldResult.grossTotalIncome).toBe(800000);
    expect(newResult.grossTotalIncome).toBe(1000000);
  });

  it('gives a nil tax liability under the new regime when taxable income is exactly 7,00,000 (FY2024-25)', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 750000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const result = calculateTaxForRegime(input, 'new');
    expect(result.taxableIncome).toBe(700000);
    expect(result.taxAfterRebate).toBe(0);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('gives a nil tax liability under the new regime when taxable income is exactly 12,00,000 (FY2025-26)', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      salary: {
        basic: 1275000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const result = calculateTaxForRegime(input, 'new');
    expect(result.taxableIncome).toBe(1200000);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('gives senior citizens a lower tax liability than below-60 taxpayers for the same income (old regime)', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 650000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const seniorInput: TaxCalculationInput = { ...input, ageCategory: '60to80' };

    const below60Result = calculateTaxForRegime(input, 'old');
    const seniorResult = calculateTaxForRegime(seniorInput, 'old');
    expect(seniorResult.totalTaxLiability).toBeLessThan(below60Result.totalTaxLiability);
  });

  it('applies deductions to reduce taxable income under the old regime', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2024-25',
      ageCategory: 'below60',
      salary: {
        basic: 1000000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
      deductions: {
        section80C: 150000,
        section80CCD1B: 50000,
      },
    };
    const withoutDeductions: TaxCalculationInput = { ...input, deductions: undefined };

    const withResult = calculateTaxForRegime(input, 'old');
    const withoutResult = calculateTaxForRegime(withoutDeductions, 'old');
    expect(withResult.taxableIncome).toBe(withoutResult.taxableIncome - 200000);
    expect(withResult.totalTaxLiability).toBeLessThan(withoutResult.totalTaxLiability);
  });
});
