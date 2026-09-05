import { describe, expect, it } from 'vitest';
import {
  calculateUsTax,
  usCapitalGainsTax,
  usChildTaxCredit,
  usFicaTax,
} from '../src/calculators/us';

describe('usFicaTax', () => {
  it('charges Social Security up to the wage base and Medicare on all wages', () => {
    expect(usFicaTax(100000)).toBeCloseTo(7650, 2);
    expect(usFicaTax(200000)).toBeCloseTo(176100 * 0.062 + 200000 * 0.0145, 2);
  });
});

describe('usCapitalGainsTax', () => {
  it('charges nothing while total taxable income stays in the 0% band', () => {
    expect(usCapitalGainsTax(10000, 20000, 'single')).toBe(0);
  });

  it('charges 15% on gains above the 0% band', () => {
    // Ordinary taxable income of 40,000 leaves 8,350 of the 0% band.
    expect(usCapitalGainsTax(20000, 40000, 'single')).toBeCloseTo(11650 * 0.15, 2);
  });

  it('charges 20% on gains above the upper threshold', () => {
    expect(usCapitalGainsTax(100000, 500000, 'single')).toBeCloseTo(33400 * 0.15 + 66600 * 0.2, 2);
  });
});

describe('usChildTaxCredit', () => {
  it('gives $2,200 per child and $500 per other dependent', () => {
    expect(usChildTaxCredit(2, 1, 100000, 'single')).toBe(4900);
  });

  it('phases the credit out above the income threshold', () => {
    expect(usChildTaxCredit(1, 0, 210000, 'single')).toBe(1700);
    expect(usChildTaxCredit(1, 0, 250000, 'single')).toBe(0);
  });
});

describe('calculateUsTax', () => {
  it('uses the married filing jointly standard deduction and brackets', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 150000,
      filingStatus: 'marriedJoint',
    });
    expect(result.us.standardDeduction).toBe(31500);
    expect(result.taxableIncome).toBe(118500);
    // 23,850 @ 10% + 73,100 @ 12% + 21,550 @ 22%
    expect(result.incomeTax).toBeCloseTo(15898, 2);
  });

  it('deducts pre-tax retirement, HSA and student loan interest above the line', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 120000,
      retirementContributions: 15000,
      hsaContributions: 4300,
      studentLoanInterest: 4000,
    });
    // Student loan interest is capped at 2,500.
    expect(result.us.adjustments).toBe(21800);
    expect(result.us.adjustedGrossIncome).toBe(98200);
    expect(result.taxableIncome).toBe(82450);
  });

  it('uses itemised deductions when they beat the standard deduction', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 200000,
      itemizedDeductions: 30000,
    });
    expect(result.us.deductionUsed).toBe(30000);
    expect(result.taxableIncome).toBe(170000);
  });

  it('taxes qualified dividends and long-term gains at the preferential rates', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 80000,
      qualifiedDividends: 5000,
      longTermCapitalGains: 15000,
    });
    expect(result.us.preferentialIncome).toBe(20000);
    expect(result.us.ordinaryTaxableIncome).toBe(64250);
    expect(result.us.capitalGainsTax).toBeCloseTo(20000 * 0.15, 2);
  });

  it('charges self-employment tax and deducts half of it', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 0,
      selfEmploymentIncome: 50000,
    });
    expect(result.us.selfEmploymentTax).toBeCloseTo(7064.78, 2);
    expect(result.us.adjustments).toBeCloseTo(3532.39, 2);
    expect(result.us.ficaTax).toBe(0);
  });

  it('applies the net investment income tax and the additional Medicare tax', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 300000,
      longTermCapitalGains: 50000,
    });
    expect(result.us.additionalMedicareTax).toBeCloseTo(100000 * 0.009, 2);
    // The lesser of the investment income (50,000) and the AGI above 200,000 is taxed at 3.8%.
    expect(result.us.netInvestmentIncomeTax).toBeCloseTo(50000 * 0.038, 2);
  });

  it('reduces federal tax by the child tax credit without creating a refund', () => {
    const result = calculateUsTax({
      country: 'us',
      annualIncome: 20000,
      dependentsUnder17: 3,
    });
    // The full credit is reported, but only the part covering the tax is applied.
    expect(result.us.childTaxCredit).toBe(6600);
    expect(result.taxCredits).toBe(result.incomeTax);
    expect(result.incomeTax - result.taxCredits).toBe(0);
  });

  it('adds state income tax when a state of residence is given', () => {
    const result = calculateUsTax({ country: 'us', annualIncome: 100000, state: 'CA' });
    expect(result.state).toBe('CA');
    expect(result.stateTax).toBeCloseTo(5311.7, 2);
    expect(result.totalTaxLiability).toBeCloseTo(result.incomeTax + result.us.ficaTax + 5311.7, 2);
  });
});
