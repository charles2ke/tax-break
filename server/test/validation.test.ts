import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  validateItrTaxpayerDetails,
  validateTaxesPaidBreakdown,
} from '../src/validation';

function baseTaxpayer(overrides: Record<string, unknown> = {}) {
  return {
    pan: 'ABCDE1234F',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    ...overrides,
  };
}

describe('validateTaxesPaidBreakdown', () => {
  it('returns undefined when no breakdown is provided', () => {
    expect(validateTaxesPaidBreakdown(undefined)).toBeUndefined();
    expect(validateTaxesPaidBreakdown(null)).toBeUndefined();
  });

  it('rejects non-object input', () => {
    expect(() => validateTaxesPaidBreakdown('120000')).toThrow(ValidationError);
    expect(() => validateTaxesPaidBreakdown(120000)).toThrow(ValidationError);
  });

  it('rejects array input', () => {
    expect(() => validateTaxesPaidBreakdown([1, 2, 3])).toThrow(ValidationError);
  });

  it('rejects negative amounts', () => {
    expect(() => validateTaxesPaidBreakdown({ tds: -1 })).toThrow(ValidationError);
  });

  it('rejects non-finite amounts', () => {
    expect(() => validateTaxesPaidBreakdown({ tcs: Number.NaN })).toThrow(ValidationError);
    expect(() => validateTaxesPaidBreakdown({ advanceTax: Number.POSITIVE_INFINITY })).toThrow(
      ValidationError,
    );
  });

  it('rejects non-number amounts', () => {
    expect(() => validateTaxesPaidBreakdown({ selfAssessmentTax: '500' })).toThrow(
      ValidationError,
    );
  });

  it('maps all four fields on success', () => {
    expect(
      validateTaxesPaidBreakdown({
        tds: 100000,
        tcs: 5000,
        advanceTax: 10000,
        selfAssessmentTax: 5000,
      }),
    ).toEqual({
      tds: 100000,
      tcs: 5000,
      advanceTax: 10000,
      selfAssessmentTax: 5000,
    });
  });

  it('leaves omitted fields undefined', () => {
    expect(validateTaxesPaidBreakdown({ tds: 100000 })).toEqual({
      tds: 100000,
      tcs: undefined,
      advanceTax: undefined,
      selfAssessmentTax: undefined,
    });
  });
});

describe('validateItrTaxpayerDetails', () => {
  it('accepts a valid date of birth', () => {
    expect(validateItrTaxpayerDetails(baseTaxpayer()).dateOfBirth).toBe('1990-05-15');
  });

  it('rejects a calendar date that does not exist', () => {
    expect(() =>
      validateItrTaxpayerDetails(baseTaxpayer({ dateOfBirth: '1990-02-31' })),
    ).toThrow(ValidationError);
  });

  it('rejects an out-of-range month/day', () => {
    expect(() =>
      validateItrTaxpayerDetails(baseTaxpayer({ dateOfBirth: '1990-99-99' })),
    ).toThrow(ValidationError);
  });
});
