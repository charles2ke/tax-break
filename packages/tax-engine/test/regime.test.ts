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

    // The New Regime standard deduction for FY 2024-25 is Rs 75,000.
    const newResult = calculateTaxForRegime(input, 'new');
    expect(newResult.taxableIncome).toBe(825000);
    expect(newResult.taxBeforeRebate).toBeCloseTo(37500);
    expect(newResult.rebate).toBe(0);
    expect(newResult.cess).toBeCloseTo(1500);
    expect(newResult.totalTaxLiability).toBe(39000);
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
        basic: 775000,
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

  it('adds equity LTCG tax (with cess) on top of slab tax without affecting taxable income', () => {
    const base: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      salary: {
        basic: 800000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const withCapitalGains: TaxCalculationInput = {
      ...base,
      capitalGains: { equityLTCG: 225000 },
    };

    const baseResult = calculateTaxForRegime(base, 'new');
    const withResult = calculateTaxForRegime(withCapitalGains, 'new');

    expect(withResult.taxableIncome).toBe(baseResult.taxableIncome);
    expect(withResult.capitalGains.equityLTCGTax).toBeCloseTo(100000 * 0.125);
    expect(withResult.totalTaxLiability).toBeGreaterThan(baseResult.totalTaxLiability);
  });

  it('adds other STCG to gross total income and taxes it at slab rates', () => {
    const withCapitalGains: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      capitalGains: { otherSTCG: 100000 },
    };
    const result = calculateTaxForRegime(withCapitalGains, 'new');
    expect(result.grossTotalIncome).toBe(100000);
    expect(result.capitalGains.totalCapitalGainsTax).toBe(0);
  });

  it('limits the standard deduction to the salary income actually earned', () => {
    const noSalary: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      otherIncome: { otherInterest: 400000 },
    };
    const result = calculateTaxForRegime(noSalary, 'new');
    expect(result.deductionsBreakdown.standardDeduction).toBe(0);
    expect(result.taxableIncome).toBe(400000);

    const smallSalary: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      salary: {
        basic: 30000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const smallSalaryResult = calculateTaxForRegime(smallSalary, 'new');
    expect(smallSalaryResult.deductionsBreakdown.standardDeduction).toBe(30000);
    expect(smallSalaryResult.taxableIncome).toBe(0);
  });

  it('applies Section 87A marginal relief just above the new regime rebate limit (FY2025-26)', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      salary: {
        basic: 1285000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const result = calculateTaxForRegime(input, 'new');
    expect(result.taxableIncome).toBe(1210000);
    // Tax before rebate is Rs 61,500; marginal relief limits the tax to the Rs 10,000 of income
    // above the Rs 12,00,000 rebate limit (plus cess).
    expect(result.taxBeforeRebate).toBeCloseTo(61500);
    expect(result.rebate).toBeCloseTo(51500);
    expect(result.totalTaxLiability).toBe(10400);
  });

  it('uses the pre 23 July 2024 capital gains rates for earlier assessment years', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2023-24',
      ageCategory: 'below60',
      capitalGains: { equitySTCG: 100000, equityLTCG: 200000 },
    };
    const result = calculateTaxForRegime(input, 'new');
    expect(result.capitalGains.equitySTCGTax).toBeCloseTo(15000);
    expect(result.capitalGains.equityLTCGExemptionUsed).toBe(100000);
    expect(result.capitalGains.equityLTCGTax).toBeCloseTo(10000);
  });

  it('computes a salary-only case for FY2021-22 where the new regime has no standard deduction', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2021-22',
      ageCategory: 'below60',
      salary: {
        basic: 900000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
    };
    const oldResult = calculateTaxForRegime(input, 'old');
    expect(oldResult.taxableIncome).toBe(850000);
    expect(oldResult.totalTaxLiability).toBe(85800);

    const newResult = calculateTaxForRegime(input, 'new');
    expect(newResult.taxableIncome).toBe(900000);
    // 5% of 2.5L + 10% of 2.5L + 15% of 1.5L = 12,500 + 25,000 + 22,500 = 60,000
    expect(newResult.taxBeforeRebate).toBeCloseTo(60000);
    expect(newResult.totalTaxLiability).toBe(62400);
  });

  it('caps a let-out house property loss set-off at 2,00,000 and disallows it under the new regime', () => {
    const input: TaxCalculationInput = {
      assessmentYear: 'FY2025-26',
      ageCategory: 'below60',
      salary: {
        basic: 1000000,
        hraReceived: 0,
        rentPaid: 0,
        cityType: 'metro',
        lta: 0,
        specialAllowance: 0,
      },
      houseProperty: {
        type: 'let-out',
        annualRentReceived: 120000,
        municipalTaxesPaid: 0,
        homeLoanInterest: 500000,
      },
    };
    // Income from house property = 1,20,000 - 36,000 - 5,00,000 = -4,16,000, restricted to
    // -2,00,000 under the Old Regime (Section 71(3A)) and to nil under the New Regime.
    const oldResult = calculateTaxForRegime(input, 'old');
    expect(oldResult.grossTotalIncome).toBe(800000);

    const newResult = calculateTaxForRegime(input, 'new');
    expect(newResult.grossTotalIncome).toBe(1000000);
  });
});
