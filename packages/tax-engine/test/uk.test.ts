import { describe, expect, it } from 'vitest';
import { calculateUkTax, ukNationalInsurance, ukPersonalAllowance } from '../src/calculators/uk';

describe('ukPersonalAllowance', () => {
  it('gives the full allowance below the taper threshold', () => {
    expect(ukPersonalAllowance(100000)).toBe(12570);
  });

  it('tapers the allowance by £1 for every £2 above £100,000', () => {
    expect(ukPersonalAllowance(110000)).toBe(7570);
    expect(ukPersonalAllowance(125140)).toBe(0);
    expect(ukPersonalAllowance(200000)).toBe(0);
  });
});

describe('ukNationalInsurance', () => {
  it('charges 8% between the primary threshold and the upper earnings limit', () => {
    expect(ukNationalInsurance(50270)).toBeCloseTo(3016, 2);
  });

  it('charges 2% above the upper earnings limit', () => {
    expect(ukNationalInsurance(60270)).toBeCloseTo(3216, 2);
  });

  it('charges nothing below the primary threshold', () => {
    expect(ukNationalInsurance(12000)).toBe(0);
  });
});

describe('calculateUkTax', () => {
  it('taxes a basic rate salary and adds National Insurance', () => {
    const result = calculateUkTax({ country: 'uk', annualIncome: 30000 });
    expect(result.currency).toBe('GBP');
    expect(result.taxableIncome).toBe(17430);
    expect(result.incomeTax).toBe(3486);
    expect(result.uk.nationalInsurance).toBeCloseTo(1394.4, 2);
    expect(result.totalTaxLiability).toBeCloseTo(4880.4, 2);
  });

  it('relieves pension contributions against non-savings income', () => {
    const result = calculateUkTax({
      country: 'uk',
      annualIncome: 60000,
      pensionContributions: 10000,
    });
    expect(result.uk.pensionRelief).toBe(10000);
    // 50,000 - 12,570 = 37,430 taxable, all within the basic rate band.
    expect(result.taxableIncome).toBe(37430);
    expect(result.incomeTax).toBe(7486);
    // National Insurance is still charged on the full salary.
    expect(result.uk.nationalInsurance).toBeCloseTo(3210.6, 2);
  });

  it('tapers the personal allowance for income over £100,000', () => {
    const result = calculateUkTax({ country: 'uk', annualIncome: 120000 });
    expect(result.uk.personalAllowance).toBe(2570);
    expect(result.taxableIncome).toBe(117430);
    // 37,700 @ 20% + 79,730 @ 40%
    expect(result.incomeTax).toBe(39432);
  });

  it('extends the rate bands by Gift Aid donations', () => {
    const withoutGiftAid = calculateUkTax({ country: 'uk', annualIncome: 60000 });
    const withGiftAid = calculateUkTax({
      country: 'uk',
      annualIncome: 60000,
      giftAidDonations: 1000,
    });
    expect(withGiftAid.uk.basicRateLimit).toBe(38700);
    // £1,000 moves from the 40% band to the 20% band.
    expect(withoutGiftAid.incomeTax - withGiftAid.incomeTax).toBe(200);
  });

  it('applies the starting rate for savings and the personal savings allowance', () => {
    const result = calculateUkTax({
      country: 'uk',
      annualIncome: 0,
      savingsInterest: 20000,
    });
    // 12,570 allowance + 5,000 starting rate + 1,000 personal savings allowance are tax free.
    expect(result.uk.startingRateForSavings).toBe(5000);
    expect(result.uk.personalSavingsAllowance).toBe(1000);
    expect(result.incomeTax).toBe(286);
  });

  it('reduces the personal savings allowance for a higher rate taxpayer', () => {
    const result = calculateUkTax({
      country: 'uk',
      annualIncome: 60000,
      savingsInterest: 2000,
    });
    expect(result.uk.startingRateForSavings).toBe(0);
    expect(result.uk.personalSavingsAllowance).toBe(500);
    // 1,500 of interest taxed at 40% on top of 7,486 of tax on the salary.
    expect(result.uk.savingsTax).toBe(600);
  });

  it('taxes dividends above the £500 allowance at the dividend rates', () => {
    const result = calculateUkTax({
      country: 'uk',
      annualIncome: 30000,
      dividendIncome: 10000,
    });
    expect(result.uk.dividendAllowance).toBe(500);
    // 9,500 of dividends within the basic rate band at 8.75%.
    expect(result.uk.dividendTax).toBeCloseTo(831.25, 2);
  });

  it('deducts student loan repayments above the plan threshold', () => {
    const result = calculateUkTax({
      country: 'uk',
      annualIncome: 40000,
      studentLoanPlan: 'plan2',
    });
    // (40,000 - 28,470) @ 9%
    expect(result.uk.studentLoanRepayment).toBe(1038);
    expect(result.totalTaxLiability).toBeCloseTo(
      result.incomeTax + result.uk.nationalInsurance + 1038,
      2,
    );
  });

  it('does not include taxable benefits when calculating student loan repayments', () => {
    const withoutBenefits = calculateUkTax({
      country: 'uk',
      annualIncome: 40000,
      studentLoanPlan: 'plan2',
    });
    const withBenefits = calculateUkTax({
      country: 'uk',
      annualIncome: 40000,
      taxableBenefits: 5000,
      studentLoanPlan: 'plan2',
    });
    expect(withoutBenefits.uk.studentLoanRepayment).toBe(1038);
    expect(withBenefits.uk.studentLoanRepayment).toBe(withoutBenefits.uk.studentLoanRepayment);
  });

  it('reports net income after all deductions', () => {
    const result = calculateUkTax({ country: 'uk', annualIncome: 45000, bonus: 5000 });
    expect(result.grossIncome).toBe(50000);
    expect(result.uk.netIncome).toBeCloseTo(50000 - result.totalTaxLiability, 2);
  });

  it('charges no tax on income within the personal allowance', () => {
    const result = calculateUkTax({ country: 'uk', annualIncome: 10000 });
    expect(result.incomeTax).toBe(0);
    expect(result.totalTaxLiability).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });
});
