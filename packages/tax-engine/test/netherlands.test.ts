import { describe, expect, it } from 'vitest';
import { calculateNetherlandsTax } from '../src/calculators/netherlands';

describe('calculateNetherlandsTax', () => {
  it('taxes salary, holiday allowance, bonus and benefits as Box 1 income', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 60000,
      holidayAllowance: 4800,
      bonus: 5000,
      taxableBenefits: 2000,
    });

    expect(result.currency).toBe('EUR');
    expect(result.grossIncome).toBe(71800);
    expect(result.netherlands.employmentIncome).toBe(71800);
    expect(result.netherlands.box1Income).toBe(71800);
    // 38,441 x 35.82% + 33,359 x 37.48% = 13,769.56 + 12,502.96
    expect(result.netherlands.box1Tax).toBeCloseTo(26272.52, 2);
  });

  it('exempts 30% of employment income under the 30% ruling', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 100000,
      thirtyPercentRuling: true,
    });

    expect(result.netherlands.thirtyPercentExemption).toBe(30000);
    expect(result.netherlands.taxableEmploymentIncome).toBe(70000);
    expect(result.taxableIncome).toBe(70000);
  });

  it('caps the 30% ruling at the EUR 246,000 salary norm', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 300000,
      thirtyPercentRuling: true,
    });

    expect(result.netherlands.thirtyPercentExemption).toBe(73800);
    expect(result.netherlands.taxableEmploymentIncome).toBe(226200);
  });

  it('deducts pension contributions from Box 1 income', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 60000,
      pensionContributions: 5000,
    });

    expect(result.netherlands.pensionDeduction).toBe(5000);
    expect(result.netherlands.box1Income).toBe(55000);
  });

  it('adds the eigenwoningforfait and deducts mortgage interest', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 60000,
      home: { wozValue: 400000, mortgageInterest: 8000 },
    });

    // 0.35% of the WOZ value.
    expect(result.netherlands.eigenwoningforfait).toBe(1400);
    expect(result.netherlands.box1Income).toBe(53400);
    // Nothing is relieved at the top rate at this income level.
    expect(result.netherlands.deductionRateAdjustment).toBe(0);
  });

  it('limits relief on deductions to the second-bracket rate for top-bracket income', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 120000,
      home: { wozValue: 400000, mortgageInterest: 12000 },
    });

    expect(result.netherlands.box1Income).toBe(109400);
    // All 12,000 of interest sits above the 76,817 threshold: 12,000 x (49.5% - 37.48%).
    expect(result.netherlands.deductionRateAdjustment).toBeCloseTo(1442.4, 2);
  });

  it('taxes Box 3 assets above the tax-free allowance and doubles it for fiscal partners', () => {
    const single = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 50000,
      box3: { savings: 100000, investments: 50000, debts: 10000 },
    });

    // Debts above the 3,800 threshold reduce the assets: 100,000 + 50,000 - 6,200.
    expect(single.netherlands.box3Assets).toBe(143800);
    expect(single.netherlands.box3TaxFreeAllowance).toBe(57684);
    expect(single.netherlands.box3Tax).toBeGreaterThan(0);

    const partnered = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 50000,
      fiscalPartner: true,
      box3: { savings: 100000, investments: 50000, debts: 10000 },
    });

    expect(partnered.netherlands.box3TaxFreeAllowance).toBe(115368);
    expect(partnered.netherlands.box3Tax).toBeLessThan(single.netherlands.box3Tax);
  });

  it('taxes Box 2 income at 24.5% and 31%', () => {
    const result = calculateNetherlandsTax({
      country: 'netherlands',
      annualIncome: 50000,
      box2Income: 100000,
    });

    // 67,804 x 24.5% + 32,196 x 31% = 16,611.98 + 9,980.76
    expect(result.netherlands.box2Tax).toBeCloseTo(26592.74, 2);
    expect(result.incomeTax).toBeCloseTo(
      result.netherlands.box1Tax + result.netherlands.box2Tax,
      2,
    );
  });

  it('never lets the tax credits create a refund', () => {
    const result = calculateNetherlandsTax({ country: 'netherlands', annualIncome: 8000 });

    expect(result.taxCredits).toBe(result.incomeTax);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('phases the tax credits out at high incomes', () => {
    const result = calculateNetherlandsTax({ country: 'netherlands', annualIncome: 150000 });

    expect(result.netherlands.generalTaxCredit).toBe(0);
    expect(result.netherlands.labourTaxCredit).toBe(0);
    expect(result.totalTaxLiability).toBe(result.incomeTax);
  });
});
