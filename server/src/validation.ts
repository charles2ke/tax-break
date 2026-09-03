import {
  AgeCategory,
  AssessmentYear,
  InternationalTaxCalculationInput,
  ItrRecommenderInput,
  listAssessmentYears,
  listUsStates,
  TaxCalculationInput,
} from '@tax-break/tax-engine';

const VALID_AGE_CATEGORIES: AgeCategory[] = ['below60', '60to80', 'above80'];
const VALID_CITY_TYPES = ['metro', 'non-metro'];
const VALID_HOUSE_PROPERTY_TYPES = ['self-occupied', 'let-out'];
const VALID_INTERNATIONAL_COUNTRIES = ['ireland', 'netherlands', 'uk', 'us', 'singapore'];
const VALID_IRELAND_FILING_STATUSES = [
  'single',
  'singleParent',
  'marriedOneIncome',
  'marriedTwoIncomes',
];
const VALID_IRELAND_PENSION_AGE_BANDS = [
  'under30',
  '30to39',
  '40to49',
  '50to54',
  '55to59',
  '60plus',
];

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
      assertNonNegativeNumber(
        section80D.selfAndFamilyPremium,
        'deductions.section80D.selfAndFamilyPremium',
      );
      assertNonNegativeNumber(section80D.parentsPremium, 'deductions.section80D.parentsPremium');
    }
  }

  const capitalGains = input.capitalGains as Record<string, unknown> | undefined;
  if (capitalGains !== undefined) {
    if (typeof capitalGains !== 'object' || capitalGains === null) {
      throw new ValidationError('capitalGains must be an object');
    }
    assertNonNegativeNumber(capitalGains.equitySTCG, 'capitalGains.equitySTCG');
    assertNonNegativeNumber(capitalGains.equityLTCG, 'capitalGains.equityLTCG');
    assertNonNegativeNumber(capitalGains.otherSTCG, 'capitalGains.otherSTCG');
    assertNonNegativeNumber(capitalGains.otherLTCG, 'capitalGains.otherLTCG');
  }

  assertNonNegativeNumber(input.taxAlreadyPaid, 'taxAlreadyPaid');

  return input as unknown as TaxCalculationInput;
}

export function validateInternationalTaxCalculationInput(
  body: unknown,
): InternationalTaxCalculationInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const input = body as Record<string, unknown>;
  if (!VALID_INTERNATIONAL_COUNTRIES.includes(input.country as string)) {
    throw new ValidationError(
      `country must be one of: ${VALID_INTERNATIONAL_COUNTRIES.join(', ')}`,
    );
  }
  if (!isNonNegativeNumber(input.annualIncome)) {
    throw new ValidationError('annualIncome must be a non-negative number');
  }
  if (input.state !== undefined) {
    const validStates = listUsStates().map((state) => state.code);
    if (typeof input.state !== 'string' || !validStates.includes(input.state as never)) {
      throw new ValidationError(`state must be one of: ${validStates.join(', ')}`);
    }
    if (input.country !== 'us') {
      throw new ValidationError('state is only supported when country is "us"');
    }
  }

  if (input.country === 'ireland') {
    validateIrelandFields(input);
  }
  if (input.country === 'netherlands') {
    validateNetherlandsFields(input);
  }

  return input as unknown as InternationalTaxCalculationInput;
}

function validateIrelandFields(input: Record<string, unknown>): void {
  assertNonNegativeNumber(input.bonus, 'bonus');
  assertNonNegativeNumber(input.taxableBenefits, 'taxableBenefits');
  assertNonNegativeNumber(input.otherIncome, 'otherIncome');
  assertNonNegativeNumber(input.pensionContributions, 'pensionContributions');
  assertNonNegativeNumber(input.spouseIncome, 'spouseIncome');
  assertNonNegativeNumber(input.medicalExpenses, 'medicalExpenses');
  assertNonNegativeNumber(input.rentPaid, 'rentPaid');

  if (
    input.filingStatus !== undefined &&
    !VALID_IRELAND_FILING_STATUSES.includes(input.filingStatus as string)
  ) {
    throw new ValidationError(
      `filingStatus must be one of: ${VALID_IRELAND_FILING_STATUSES.join(', ')}`,
    );
  }
  if (
    input.pensionAgeBand !== undefined &&
    !VALID_IRELAND_PENSION_AGE_BANDS.includes(input.pensionAgeBand as string)
  ) {
    throw new ValidationError(
      `pensionAgeBand must be one of: ${VALID_IRELAND_PENSION_AGE_BANDS.join(', ')}`,
    );
  }

  const shares = input.shares as Record<string, unknown> | undefined;
  if (shares !== undefined) {
    if (typeof shares !== 'object' || shares === null || Array.isArray(shares)) {
      throw new ValidationError('shares must be an object');
    }
    assertNonNegativeNumber(shares.rsuVestedValue, 'shares.rsuVestedValue');
    assertNonNegativeNumber(shares.shareSaleProceeds, 'shares.shareSaleProceeds');
    assertNonNegativeNumber(shares.shareSaleCost, 'shares.shareSaleCost');
    assertNonNegativeNumber(shares.capitalLossesForward, 'shares.capitalLossesForward');
  }
}

function assertBoolean(value: unknown, field: string): void {
  if (value === undefined) return;
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${field} must be a boolean`);
  }
}

function assertObject(value: unknown, field: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function validateNetherlandsFields(input: Record<string, unknown>): void {
  assertNonNegativeNumber(input.holidayAllowance, 'holidayAllowance');
  assertNonNegativeNumber(input.bonus, 'bonus');
  assertNonNegativeNumber(input.taxableBenefits, 'taxableBenefits');
  assertNonNegativeNumber(input.otherIncome, 'otherIncome');
  assertNonNegativeNumber(input.pensionContributions, 'pensionContributions');
  assertNonNegativeNumber(input.box2Income, 'box2Income');
  assertNonNegativeNumber(input.otherDeductions, 'otherDeductions');
  assertBoolean(input.thirtyPercentRuling, 'thirtyPercentRuling');
  assertBoolean(input.fiscalPartner, 'fiscalPartner');

  const home = assertObject(input.home, 'home');
  if (home !== undefined) {
    assertNonNegativeNumber(home.wozValue, 'home.wozValue');
    assertNonNegativeNumber(home.mortgageInterest, 'home.mortgageInterest');
  }

  const box3 = assertObject(input.box3, 'box3');
  if (box3 !== undefined) {
    assertNonNegativeNumber(box3.savings, 'box3.savings');
    assertNonNegativeNumber(box3.investments, 'box3.investments');
    assertNonNegativeNumber(box3.debts, 'box3.debts');
  }
}

export interface AdvanceTaxRequestBody {
  totalTaxLiability: number;
  taxAlreadyPaid: number;
  assessmentYear: AssessmentYear;
}

export function validateAdvanceTaxInput(body: unknown): AdvanceTaxRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const input = body as Record<string, unknown>;

  const validAssessmentYears = listAssessmentYears();
  const assessmentYear = input.assessmentYear as AssessmentYear;
  if (!validAssessmentYears.includes(assessmentYear)) {
    throw new ValidationError(`assessmentYear must be one of: ${validAssessmentYears.join(', ')}`);
  }
  if (!isNonNegativeNumber(input.totalTaxLiability)) {
    throw new ValidationError('totalTaxLiability must be a non-negative number');
  }
  assertNonNegativeNumber(input.taxAlreadyPaid, 'taxAlreadyPaid');

  return {
    totalTaxLiability: input.totalTaxLiability,
    taxAlreadyPaid: (input.taxAlreadyPaid as number) ?? 0,
    assessmentYear,
  };
}

const VALID_ITR_BOOLEAN_FIELDS = [
  'hasSalaryIncome',
  'hasSingleHouseProperty',
  'hasMultipleHouseProperties',
  'hasCapitalGains',
  'hasBusinessOrProfessionIncome',
  'isPresumptiveTaxationScheme',
  'hasForeignAssetsOrIncome',
  'isCompanyDirector',
  'hasUnlistedEquityShares',
  'isResidentIndividual',
] as const;

export function validateItrRecommenderInput(body: unknown): ItrRecommenderInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const input = body as Record<string, unknown>;

  for (const field of VALID_ITR_BOOLEAN_FIELDS) {
    if (input[field] !== undefined && typeof input[field] !== 'boolean') {
      throw new ValidationError(`${field} must be a boolean`);
    }
  }
  assertNonNegativeNumber(input.totalIncome, 'totalIncome');

  return input as unknown as ItrRecommenderInput;
}
