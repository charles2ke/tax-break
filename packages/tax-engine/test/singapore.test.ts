import { describe, expect, it } from 'vitest';
import {
  calculateSingaporeTax,
  singaporeEarnedIncomeRelief,
  singaporeLifeInsuranceRelief,
} from '../src/calculators/singapore';

describe('singaporeEarnedIncomeRelief', () => {
  it('increases with the age band and is capped by earned income', () => {
    expect(singaporeEarnedIncomeRelief(100000, 'below55')).toBe(1000);
    expect(singaporeEarnedIncomeRelief(100000, '55to59')).toBe(6000);
    expect(singaporeEarnedIncomeRelief(100000, '60plus')).toBe(8000);
    expect(singaporeEarnedIncomeRelief(500, 'below55')).toBe(500);
  });
});

describe('singaporeLifeInsuranceRelief', () => {
  it('is unavailable once CPF contributions reach $5,000', () => {
    expect(singaporeLifeInsuranceRelief(3000, 5000)).toBe(0);
  });

  it('is limited to $5,000 less the CPF contributions made', () => {
    expect(singaporeLifeInsuranceRelief(3000, 3000)).toBe(2000);
    expect(singaporeLifeInsuranceRelief(1000, 0)).toBe(1000);
  });
});

describe('calculateSingaporeTax', () => {
  it('applies the earned income relief and the tax rebate to a simple salary', () => {
    const result = calculateSingaporeTax({ country: 'singapore', annualIncome: 100000 });
    expect(result.currency).toBe('SGD');
    expect(result.singapore.earnedIncomeRelief).toBe(1000);
    expect(result.taxableIncome).toBe(99000);
    // 3,350 on the first 80,000 plus 19,000 @ 11.5%
    expect(result.incomeTax).toBeCloseTo(5535, 2);
    // 60% rebate capped at 200.
    expect(result.taxCredits).toBe(200);
    expect(result.totalTaxLiability).toBeCloseTo(5335, 2);
  });

  it('includes bonus, director fees, benefits and other income', () => {
    const result = calculateSingaporeTax({
      country: 'singapore',
      annualIncome: 90000,
      bonus: 10000,
      directorsFees: 5000,
      taxableBenefits: 3000,
      rentalIncome: 12000,
      otherIncome: 2000,
    });
    expect(result.singapore.employmentIncome).toBe(108000);
    expect(result.singapore.otherIncome).toBe(14000);
    expect(result.grossIncome).toBe(122000);
  });

  it('deducts employment expenses and 250% of approved donations', () => {
    const result = calculateSingaporeTax({
      country: 'singapore',
      annualIncome: 100000,
      employmentExpenses: 2000,
      approvedDonations: 1000,
    });
    expect(result.singapore.donationDeduction).toBe(2500);
    expect(result.singapore.assessableIncome).toBe(95500);
  });

  it('allows CPF, SRS and family reliefs', () => {
    const result = calculateSingaporeTax({
      country: 'singapore',
      annualIncome: 120000,
      reliefs: {
        cpfContributions: 20400,
        srsContributions: 15300,
        cpfCashTopUp: 8000,
        spouseRelief: true,
        qualifyingChildren: 2,
        dependantParents: 1,
        nsmanRelief: true,
        courseFees: 6000,
      },
    });
    expect(result.singapore.cpfAndSrsRelief).toBe(43700);
    // 2,000 spouse + 2 x 4,000 children + 9,000 parent
    expect(result.singapore.familyRelief).toBe(19000);
    // 3,000 NSman + course fees capped at 5,500
    expect(result.singapore.otherRelief).toBe(8500);
    expect(result.singapore.totalReliefsBeforeCap).toBe(72200);
    expect(result.taxableIncome).toBe(47800);
  });

  it('caps total personal reliefs at $80,000', () => {
    const result = calculateSingaporeTax({
      country: 'singapore',
      annualIncome: 300000,
      reliefs: {
        cpfContributions: 37740,
        srsContributions: 15300,
        cpfCashTopUp: 16000,
        qualifyingChildren: 4,
      },
    });
    expect(result.singapore.totalReliefsBeforeCap).toBeGreaterThan(80000);
    expect(result.singapore.totalReliefsAllowed).toBe(80000);
    expect(result.taxableIncome).toBe(220000);
  });

  it('charges no tax on chargeable income within the first $20,000', () => {
    const result = calculateSingaporeTax({ country: 'singapore', annualIncome: 20000 });
    expect(result.incomeTax).toBe(0);
    expect(result.totalTaxLiability).toBe(0);
  });

  it('reports net income after tax', () => {
    const result = calculateSingaporeTax({ country: 'singapore', annualIncome: 150000 });
    expect(result.singapore.netIncome).toBeCloseTo(150000 - result.totalTaxLiability, 2);
  });
});
