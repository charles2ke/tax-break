import { describe, expect, it } from 'vitest';
import { compareRegimes } from '../src/calculators/compare';
import { generateItrJson, itrAssessmentYear, ItrJsonError } from '../src/generators/itrJson';
import { TaxCalculationInput } from '../src/types';

const INPUT: TaxCalculationInput = {
  assessmentYear: 'FY2025-26',
  ageCategory: 'below60',
  salary: {
    basic: 900000,
    hraReceived: 360000,
    rentPaid: 300000,
    cityType: 'metro',
    lta: 0,
    specialAllowance: 240000,
  },
  otherIncome: { savingsInterest: 8000, otherInterest: 22000 },
  deductions: { section80C: 150000, section80CCD1B: 50000 },
  taxAlreadyPaid: 120000,
};

const TAXPAYER = {
  pan: 'abcde1234f',
  firstName: 'Asha',
  lastName: 'Kumar',
  dateOfBirth: '1990-04-15',
  place: 'Bengaluru',
};

function build(overrides: Partial<Parameters<typeof generateItrJson>[0]> = {}) {
  const result = compareRegimes(INPUT);
  return generateItrJson({
    form: 'ITR-1',
    assessmentYear: 'FY2025-26',
    input: INPUT,
    result,
    taxpayer: TAXPAYER,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  });
}

/** Reads a nested section of the generated document without widening everything to `any`. */
function section(json: Record<string, unknown>, path: string): Record<string, unknown> {
  return path
    .split('.')
    .reduce<Record<string, unknown>>(
      (acc, key) => acc[key] as Record<string, unknown>,
      json,
    );
}

describe('itrAssessmentYear', () => {
  it('converts a financial year to the ITD assessment year', () => {
    expect(itrAssessmentYear('FY2025-26')).toBe('2026');
    expect(itrAssessmentYear('FY2021-22')).toBe('2022');
  });
});

describe('generateItrJson', () => {
  it('wraps the return in the ITR/ITR1 envelope with form metadata', () => {
    const json = build();

    expect(section(json, 'ITR.ITR1.Form_ITR1')).toMatchObject({
      FormName: 'ITR1',
      Description: 'Sahaj',
      AssessmentYear: '2026',
    });
    expect(section(json, 'ITR.ITR1.CreationInfo').JSONCreationDate).toBe('2026-07-01');
  });

  it('normalises the PAN and copies personal details', () => {
    const json = build();
    const personalInfo = section(json, 'ITR.ITR1.PersonalInfo');

    expect(personalInfo.PAN).toBe('ABCDE1234F');
    expect(personalInfo.AssesseeName).toMatchObject({
      FirstName: 'Asha',
      SurNameOrOrgName: 'Kumar',
    });
    expect(personalInfo.DOB).toBe('1990-04-15');
    expect(section(json, 'ITR.ITR1.Verification.Declaration').AssesseeVerName).toBe('Asha Kumar');
  });

  it('carries the computed income, deductions and tax from the chosen regime', () => {
    const result = compareRegimes(INPUT);
    const json = build({ regime: 'old' });
    const income = section(json, 'ITR.ITR1.ITR1_IncomeDeductions');

    expect(section(json, 'ITR.ITR1.FilingStatus').OptOutNewTaxRegime).toBe('Y');
    expect(income.GrossTotIncome).toBe(Math.round(result.old.grossTotalIncome));
    expect(income.TotalIncome).toBe(Math.round(result.old.taxableIncome));
    expect(section(json, 'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA').Section80C).toBe(
      150000,
    );
    expect(section(json, 'ITR.ITR1.ITR1_TaxComputation').NetTaxLiability).toBe(
      Math.round(result.old.totalTaxLiability),
    );
  });

  it('defaults to the recommended regime', () => {
    const result = compareRegimes(INPUT);
    const json = build();

    expect(section(json, 'ITR.ITR1.FilingStatus').OptOutNewTaxRegime).toBe(
      result.recommendedRegime === 'old' ? 'Y' : 'N',
    );
  });

  it('reports the balance payable and any refund due', () => {
    const result = compareRegimes(INPUT);
    const liability = Math.round(result[result.recommendedRegime].totalTaxLiability);
    const json = build();

    expect(section(json, 'ITR.ITR1.TaxPaid.TaxsPaid').TotalTaxesPaid).toBe(120000);
    expect(section(json, 'ITR.ITR1.TaxPaid').BalTaxPayable).toBe(Math.max(liability - 120000, 0));
    expect(section(json, 'ITR.ITR1.Refund').RefundDue).toBe(Math.max(120000 - liability, 0));
  });

  it('emits an ITR4 envelope for ITR-4', () => {
    const json = build({ form: 'ITR-4' });

    expect(Object.keys(section(json, 'ITR'))).toEqual(['ITR4']);
    expect(section(json, 'ITR.ITR4.Form_ITR4').Description).toBe('Sugam');
  });

  it('rejects unsupported forms and invalid PANs', () => {
    expect(() => build({ form: 'ITR-2' })).toThrow(ItrJsonError);
    expect(() => build({ taxpayer: { ...TAXPAYER, pan: 'NOTAPAN' } })).toThrow(ItrJsonError);
  });
});
