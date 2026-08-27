import {
  AgeCategory,
  AssessmentYear,
  InternationalTaxCalculationInput,
  listAssessmentYears,
  TaxCalculationInput,
} from '@tax-break/tax-engine';

const VALID_AGE_CATEGORIES: AgeCategory[] = ['below60', '60to80', 'above80'];
const VALID_CITY_TYPES = ['metro', 'non-metro'];
const VALID_HOUSE_PROPERTY_TYPES = ['self-occupied', 'let-out'];
const VALID_INTERNATIONAL_COUNTRIES = ['ireland', 'netherlands', 'uk', 'us', 'singapore'];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function assertNonNegativeNumber(value: unknown, field: string): void {
  if (value === undefined) return;
  if (!isNonNegativeNumber(value)) {
    throw new ValidationError(`${field} must be a non-negative number`);
  }
}

/**
 * Validates and normalizes an incoming request body into a TaxCalculationInput.
 * Throws ValidationError with a descriptive message on invalid input.
 */
export function validateTaxCalculationInput(body: unknown): TaxCalculationInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  export function validateInternationalTaxCalculationInput(body: unknown): InternationalTaxCalculationInput {
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Request body must be an object');
    }

    const input = body as Record<string, unknown>;
    if (!VALID_INTERNATIONAL_COUNTRIES.includes(input.country as string)) {
      throw new ValidationError(`country must be one of: ${VALID_INTERNATIONAL_COUNTRIES.join(', ')}`);
    }
    if (!isNonNegativeNumber(input.annualIncome)) {
      throw new ValidationError('annualIncome must be a non-negative number');
    }

    return input as unknown as InternationalTaxCalculationInput;
  }

  const input = body as Record<string, unknown>;

  const validAssessmentYears = listAssessmentYears();
  const assessmentYear = input.assessmentYear as AssessmentYear;
  if (!validAssessmentYears.includes(assessmentYear)) {
    throw new ValidationError(`assessmentYear must be one of: ${validAssessmentYears.join(', ')}`);
  }

  const ageCategory = input.ageCategory as AgeCategory;
  if (!VALID_AGE_CATEGORIES.includes(ageCategory)) {
    throw new ValidationError(`ageCategory must be one of: ${VALID_AGE_CATEGORIES.join(', ')}`);
  }

  const salary = input.salary as Record<string, unknown> | undefined;
  if (salary !== undefined) {
    if (typeof salary !== 'object' || salary === null) {
      throw new ValidationError('salary must be an object');
    }
    assertNonNegativeNumber(salary.basic, 'salary.basic');
    assertNonNegativeNumber(salary.hraReceived, 'salary.hraReceived');
    assertNonNegativeNumber(salary.rentPaid, 'salary.rentPaid');
    assertNonNegativeNumber(salary.lta, 'salary.lta');
    assertNonNegativeNumber(salary.specialAllowance, 'salary.specialAllowance');
    assertNonNegativeNumber(salary.otherTaxableAllowances, 'salary.otherTaxableAllowances');
    if (salary.cityType !== undefined && !VALID_CITY_TYPES.includes(salary.cityType as string)) {
      throw new ValidationError(`salary.cityType must be one of: ${VALID_CITY_TYPES.join(', ')}`);
    }
  }

  const houseProperty = input.houseProperty as Record<string, unknown> | undefined;
  if (houseProperty !== undefined) {
    if (typeof houseProperty !== 'object' || houseProperty === null) {
      throw new ValidationError('houseProperty must be an object');
    }
    if (!VALID_HOUSE_PROPERTY_TYPES.includes(houseProperty.type as string)) {
      throw new ValidationError(
        `houseProperty.type must be one of: ${VALID_HOUSE_PROPERTY_TYPES.join(', ')}`,
      );
    }
    assertNonNegativeNumber(houseProperty.homeLoanInterest, 'houseProperty.homeLoanInterest');
    assertNonNegativeNumber(houseProperty.annualRentReceived, 'houseProperty.annualRentReceived');
    assertNonNegativeNumber(houseProperty.municipalTaxesPaid, 'houseProperty.municipalTaxesPaid');
  }

  const otherIncome = input.otherIncome as Record<string, unknown> | undefined;
  if (otherIncome !== undefined) {
    if (typeof otherIncome !== 'object' || otherIncome === null) {
      throw new ValidationError('otherIncome must be an object');
    }
    assertNonNegativeNumber(otherIncome.savingsInterest, 'otherIncome.savingsInterest');
    assertNonNegativeNumber(otherIncome.otherInterest, 'otherIncome.otherInterest');
    assertNonNegativeNumber(otherIncome.dividendIncome, 'otherIncome.dividendIncome');
    assertNonNegativeNumber(otherIncome.otherIncome, 'otherIncome.otherIncome');
  }

  const deductions = input.deductions as Record<string, unknown> | undefined;
  if (deductions !== undefined) {
    if (typeof deductions !== 'object' || deductions === null) {
      throw new ValidationError('deductions must be an object');
    }
    assertNonNegativeNumber(deductions.section80C, 'deductions.section80C');
    assertNonNegativeNumber(deductions.section80CCD1B, 'deductions.section80CCD1B');
    assertNonNegativeNumber(deductions.section80E, 'deductions.section80E');
    assertNonNegativeNumber(deductions.section80G, 'deductions.section80G');

    const section80D = deductions.section80D as Record<string, unknown> | undefined;
    if (section80D !== undefined) {
      if (typeof section80D !== 'object' || section80D === null) {
        throw new ValidationError('deductions.section80D must be an object');
      }
      assertNonNegativeNumber(section80D.selfAndFamilyPremium, 'deductions.section80D.selfAndFamilyPremium');
      assertNonNegativeNumber(section80D.parentsPremium, 'deductions.section80D.parentsPremium');
    }
  }

  return input as unknown as TaxCalculationInput;
}
