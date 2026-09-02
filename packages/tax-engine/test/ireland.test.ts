import { describe, expect, it } from 'vitest';
import { calculateIrelandTax } from '../src/calculators/ireland';

describe('calculateIrelandTax', () => {
  it('taxes salary, bonus, benefits and vested shares as employment income', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 60000,
      bonus: 10000,
      taxableBenefits: 1000,
      shares: { rsuVestedValue: 15000 },
    });

    expect(result.currency).toBe('EUR');
    expect(result.grossIncome).toBe(86000);
    expect(result.ireland.employmentIncome).toBe(86000);
    expect(result.ireland.shareVestingIncome).toBe(15000);
    // 44,000 @ 20% + 42,000 @ 40% = 8,800 + 16,800.
    expect(result.incomeTax).toBe(25600);
    expect(result.taxCredits).toBe(4000);
  });

  it('relieves pension contributions up to the age-related percentage of earnings', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 80000,
      pensionContributions: 20000,
      pensionAgeBand: '30to39',
    });

    // 20% of 80,000 = 16,000 is the maximum relief for a taxpayer in their thirties.
    expect(result.ireland.pensionRelief).toBe(16000);
    expect(result.taxableIncome).toBe(64000);
  });

  it('caps pension relief at the EUR 115,000 earnings limit', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 200000,
      pensionContributions: 60000,
      pensionAgeBand: '60plus',
    });

    // 40% of the 115,000 earnings cap.
    expect(result.ireland.pensionRelief).toBe(46000);
  });

  it('extends the standard rate cut-off point for a jointly assessed couple', () => {
    const oneIncome = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 90000,
      filingStatus: 'marriedOneIncome',
    });
    expect(oneIncome.ireland.standardRateCutOff).toBe(53000);
    expect(oneIncome.taxCredits).toBe(6000);

    const twoIncomes = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 90000,
      filingStatus: 'marriedTwoIncomes',
      spouseIncome: 40000,
    });
    // The transferable extension is capped at EUR 35,000.
    expect(twoIncomes.ireland.standardRateCutOff).toBe(88000);
    // Personal credit (4,000) plus an employee credit for each spouse.
    expect(twoIncomes.taxCredits).toBe(8000);
  });

  it('charges USC and PRSI on gross income without pension relief', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 50000,
      pensionContributions: 5000,
      pensionAgeBand: '30to39',
    });

    // 12,012 @ 0.5% + 15,370 @ 2% + 22,618 @ 3%.
    expect(result.ireland.universalSocialCharge).toBeCloseTo(1046, 2);
    expect(result.ireland.prsi).toBeCloseTo(2050, 2);
  });

  it('exempts low incomes from USC and PRSI', () => {
    const result = calculateIrelandTax({ country: 'ireland', annualIncome: 12000 });
    expect(result.ireland.universalSocialCharge).toBe(0);
    expect(result.ireland.prsi).toBe(0);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('charges CGT at 33% on share sales after the annual exemption', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 60000,
      shares: {
        shareSaleProceeds: 30000,
        shareSaleCost: 18000,
        capitalLossesForward: 1000,
      },
    });

    expect(result.ireland.capitalGain).toBe(11000);
    expect(result.ireland.taxableCapitalGain).toBe(9730);
    expect(result.ireland.capitalGainsTax).toBeCloseTo(3210.9, 2);
    expect(result.totalTaxLiability).toBeCloseTo(15006 + 3210.9, 2);
  });

  it('floors taxable gain and CGT at zero for a loss-making disposal', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 40000,
      shares: { shareSaleProceeds: 5000, shareSaleCost: 9000 },
    });

    expect(result.ireland.capitalGain).toBe(-4000);
    expect(result.ireland.taxableCapitalGain).toBe(0);
    expect(result.ireland.capitalGainsTax).toBe(0);
  });

  it('applies medical expenses relief and the rent tax credit as non-refundable credits', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 60000,
      medicalExpenses: 2000,
      rentPaid: 12000,
    });

    // 4,000 of personal + employee credits, 400 of medical relief and the 1,000 rent credit cap.
    expect(result.taxCredits).toBe(5400);
  });

  it('never lets credits reduce the income tax below zero', () => {
    const result = calculateIrelandTax({ country: 'ireland', annualIncome: 10000 });
    expect(result.incomeTax).toBe(2000);
    expect(result.taxCredits).toBe(2000);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('reports net income after all taxes on income and gains', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: 60000,
      shares: { shareSaleProceeds: 10000, shareSaleCost: 6000 },
    });

    const totalIncomeAndGains = 60000 + 4000;
    expect(result.ireland.netIncome).toBeCloseTo(totalIncomeAndGains - result.totalTaxLiability, 2);
    expect(result.effectiveTaxRate).toBeCloseTo(
      (result.totalTaxLiability / totalIncomeAndGains) * 100,
      6,
    );
  });

  it('ignores negative inputs', () => {
    const result = calculateIrelandTax({
      country: 'ireland',
      annualIncome: -1000,
      bonus: -500,
      otherIncome: -200,
    });
    expect(result.grossIncome).toBe(0);
    expect(result.totalTaxLiability).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });
});
