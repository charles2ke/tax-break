/**
 * Generator for the Income Tax Department's ITR JSON upload format.
 *
 * The e-filing portal (and every ERI/GSP intermediary API) accepts a return as a JSON document
 * whose shape follows the published ITR schema for the assessment year. This module builds that
 * document for the two forms whose fields map cleanly onto the data this app already collects:
 * ITR-1 (Sahaj) and ITR-4 (Sugam). It is deliberately schema-shaped rather than schema-complete:
 * the exact schema version changes every year, so the payload is always validated by the
 * receiving provider before submission.
 */

import {
  AssessmentYear,
  ItrForm,
  Regime,
  RegimeComparisonResult,
  TaxBreakdown,
  TaxCalculationInput,
} from '../types';

/** Personal details that the tax computation does not need, but a filed return does. */
export interface ItrTaxpayerDetails {
  /** Permanent Account Number, e.g. ABCDE1234F. */
  pan: string;
  firstName?: string;
  middleName?: string;
  lastName: string;
  /** Date of birth in ISO (YYYY-MM-DD) form. */
  dateOfBirth: string;
  email?: string;
  mobile?: string;
  address?: {
    residenceName?: string;
    residenceNo?: string;
    roadOrStreet?: string;
    localityOrArea?: string;
    cityOrTownOrDistrict?: string;
    /** Two-digit ITD state code, e.g. "27" for Maharashtra. */
    stateCode?: string;
    pinCode?: string;
    countryCode?: string;
  };
  bankAccount?: {
    ifsc: string;
    accountNumber: string;
    bankName?: string;
  };
  /** Place of verification (city). */
  place?: string;
}

export interface GenerateItrJsonOptions {
  form: ItrForm;
  assessmentYear: AssessmentYear;
  input: TaxCalculationInput;
  result: RegimeComparisonResult;
  /** Regime the return is filed under. Defaults to the recommended regime. */
  regime?: Regime;
  taxpayer: ItrTaxpayerDetails;
  /**
   * Breakdown of `input.taxAlreadyPaid` across the ITR's payment categories. `taxAlreadyPaid` is
   * a single aggregate used for the tax estimate, but the filed return records each category
   * separately, so this breakdown is required whenever tax has already been paid.
   */
  taxesPaidBreakdown?: TaxesPaidBreakdown;
  /** Overrides the creation timestamp; used by tests to keep the output deterministic. */
  createdAt?: Date;
}

/** Breakdown of tax already paid across the categories the ITR schema tracks separately. */
export interface TaxesPaidBreakdown {
  tds?: number;
  tcs?: number;
  advanceTax?: number;
  selfAssessmentTax?: number;
}

export class ItrJsonError extends Error {}

const SUPPORTED_FORMS: ItrForm[] = ['ITR-1', 'ITR-4'];
const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOFTWARE_NAME = 'Tax Break';
const SCHEMA_VERSION = 'Ver1.0';
/** Allowed rounding drift when comparing an independently-rounded breakdown to its aggregate. */
const ROUNDING_TOLERANCE = 1;

/** Converts `FY2025-26` into the ITD assessment year label `2026`. */
export function itrAssessmentYear(assessmentYear: AssessmentYear): string {
  const match = /^FY(\d{4})-(\d{2})$/.exec(assessmentYear);
  if (!match) throw new ItrJsonError(`Unsupported assessment year: ${assessmentYear}`);
  return String(Number(match[1]) + 1);
}

function round(value: number): number {
  return Math.round(value);
}

function toItdDate(isoDate: string): string {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new ItrJsonError(`Date must be in YYYY-MM-DD form, received: ${isoDate}`);
  }
  return isoDate;
}

function salaryTotals(input: TaxCalculationInput) {
  const salary = input.salary;
  if (!salary) return { gross: 0, basic: 0, allowances: 0, perquisites: 0 };
  const basic = salary.basic ?? 0;
  const allowances =
    (salary.hraReceived ?? 0) +
    (salary.lta ?? 0) +
    (salary.specialAllowance ?? 0) +
    (salary.otherTaxableAllowances ?? 0);
  return { gross: basic + allowances, basic, allowances, perquisites: 0 };
}

function otherSourcesTotal(input: TaxCalculationInput): number {
  const other = input.otherIncome;
  if (!other) return 0;
  return (
    (other.savingsInterest ?? 0) +
    (other.otherInterest ?? 0) +
    (other.dividendIncome ?? 0) +
    (other.otherIncome ?? 0)
  );
}

function buildChapterVIA(breakdown: TaxBreakdown) {
  const deductions = breakdown.deductionsBreakdown;
  return {
    Section80C: round(deductions.section80C),
    Section80CCD1B: round(deductions.section80CCD1B),
    Section80D: round(deductions.section80D),
    Section80E: round(deductions.section80E),
    Section80G: round(deductions.section80G),
    Section80TTA: round(deductions.section80TTA_TTB),
    TotalChapVIADeductions: round(deductions.total - deductions.standardDeduction),
  };
}

function buildTaxPaid(
  breakdown: TaxBreakdown,
  input: TaxCalculationInput,
  taxesPaidBreakdown: TaxesPaidBreakdown | undefined,
) {
  const aggregate = round(input.taxAlreadyPaid ?? 0);
  if (aggregate > 0) {
    if (!taxesPaidBreakdown) {
      throw new ItrJsonError(
        'taxesPaidBreakdown (TDS, TCS, advance tax, self-assessment tax) is required to file a ' +
          'return when tax has already been paid; it cannot be inferred from the aggregate ' +
          'taxAlreadyPaid figure used for the estimate.',
      );
    }
    const tds = round(taxesPaidBreakdown.tds ?? 0);
    const tcs = round(taxesPaidBreakdown.tcs ?? 0);
    const advanceTax = round(taxesPaidBreakdown.advanceTax ?? 0);
    const selfAssessmentTax = round(taxesPaidBreakdown.selfAssessmentTax ?? 0);
    const total = tds + tcs + advanceTax + selfAssessmentTax;
    // Each component is rounded independently, so allow a small tolerance rather than requiring
    // an exact match against the aggregate (also rounded) to avoid spurious rejections.
    if (Math.abs(total - aggregate) > ROUNDING_TOLERANCE) {
      throw new ItrJsonError(
        `taxesPaidBreakdown must add up to taxAlreadyPaid (${aggregate}) within ` +
          `±${ROUNDING_TOLERANCE}; received ${total}.`,
      );
    }
    const balance = round(breakdown.totalTaxLiability) - total;
    return {
      TaxsPaid: {
        TDS: tds,
        AdvanceTax: advanceTax,
        SelfAssessmentTax: selfAssessmentTax,
        TCS: tcs,
        TotalTaxesPaid: total,
      },
      BalTaxPayable: Math.max(balance, 0),
    };
  }
  return {
    TaxsPaid: {
      TDS: 0,
      AdvanceTax: 0,
      SelfAssessmentTax: 0,
      TCS: 0,
      TotalTaxesPaid: 0,
    },
    BalTaxPayable: Math.max(round(breakdown.totalTaxLiability), 0),
  };
}

function fullName(taxpayer: ItrTaxpayerDetails): string {
  return [taxpayer.firstName, taxpayer.middleName, taxpayer.lastName]
    .filter((part) => part && part.trim())
    .join(' ')
    .trim();
}

function buildVerification(taxpayer: ItrTaxpayerDetails, createdAt: Date) {
  return {
    Declaration: {
      AssesseeVerName: fullName(taxpayer),
      AssesseeVerPAN: taxpayer.pan,
    },
    Capacity: 'S',
    Place: taxpayer.place ?? '',
    Date: createdAt.toISOString().slice(0, 10),
  };
}

function buildPersonalInfo(taxpayer: ItrTaxpayerDetails) {
  const address = taxpayer.address ?? {};
  return {
    AssesseeName: {
      FirstName: taxpayer.firstName ?? '',
      MiddleName: taxpayer.middleName ?? '',
      SurNameOrOrgName: taxpayer.lastName,
    },
    PAN: taxpayer.pan,
    DOB: toItdDate(taxpayer.dateOfBirth),
    Address: {
      ResidenceNo: address.residenceNo ?? '',
      ResidenceName: address.residenceName ?? '',
      RoadOrStreet: address.roadOrStreet ?? '',
      LocalityOrArea: address.localityOrArea ?? '',
      CityOrTownOrDistrict: address.cityOrTownOrDistrict ?? '',
      StateCode: address.stateCode ?? '',
      CountryCode: address.countryCode ?? '91',
      PinCode: address.pinCode ?? '',
      EmailAddress: taxpayer.email ?? '',
      MobileNo: taxpayer.mobile ?? '',
    },
  };
}

function buildRefund(
  taxpayer: ItrTaxpayerDetails,
  breakdown: TaxBreakdown,
  input: TaxCalculationInput,
) {
  const refundDue = Math.max(
    round(input.taxAlreadyPaid ?? 0) - round(breakdown.totalTaxLiability),
    0,
  );
  const bank = taxpayer.bankAccount;
  return {
    RefundDue: refundDue,
    BankAccountDtls: bank
      ? {
          AddtnlBankDetails: [
            {
              IFSCCode: bank.ifsc,
              BankName: bank.bankName ?? '',
              BankAccountNo: bank.accountNumber,
              AccountType: 'SB',
            },
          ],
        }
      : undefined,
  };
}

/**
 * Builds the ITR JSON document for a completed calculation.
 *
 * @throws {ItrJsonError} when the form is not supported or the taxpayer details are invalid.
 */
export function generateItrJson(options: GenerateItrJsonOptions): Record<string, unknown> {
  const { form, assessmentYear, input, result, taxpayer } = options;
  if (!SUPPORTED_FORMS.includes(form)) {
    throw new ItrJsonError(
      `ITR JSON generation currently supports ${SUPPORTED_FORMS.join(' and ')}; ${form} must be ` +
        'prepared on the e-filing portal.',
    );
  }
  const pan = taxpayer.pan?.toUpperCase() ?? '';
  if (!PAN_PATTERN.test(pan)) {
    throw new ItrJsonError('A valid PAN (e.g. ABCDE1234F) is required to generate the ITR JSON.');
  }
  if (!taxpayer.lastName?.trim()) {
    throw new ItrJsonError('The surname is required to generate the ITR JSON.');
  }

  const regime = options.regime ?? result.recommendedRegime;
  const breakdown = regime === 'old' ? result.old : result.new;
  const createdAt = options.createdAt ?? new Date();
  const normalisedTaxpayer: ItrTaxpayerDetails = { ...taxpayer, pan };

  const salary = salaryTotals(input);
  const houseProperty = round(
    breakdown.grossTotalIncome -
      breakdown.taxableSalaryIncome -
      otherSourcesTotal(input) -
      breakdown.capitalGains.otherSTCGAddedToIncome,
  );
  const key = form === 'ITR-1' ? 'ITR1' : 'ITR4';

  const body = {
    CreationInfo: {
      SWVersionNo: '1.0',
      SWCreatedBy: SOFTWARE_NAME,
      JSONCreatedBy: SOFTWARE_NAME,
      JSONCreationDate: createdAt.toISOString().slice(0, 10),
      IntermediaryCity: normalisedTaxpayer.place ?? '',
      Digest: '-',
    },
    [`Form_${key}`]: {
      FormName: key,
      Description: form === 'ITR-1' ? 'Sahaj' : 'Sugam',
      AssessmentYear: itrAssessmentYear(assessmentYear),
      SchemaVer: SCHEMA_VERSION,
      FormVer: SCHEMA_VERSION,
    },
    PersonalInfo: buildPersonalInfo(normalisedTaxpayer),
    FilingStatus: {
      ReturnFileSec: 11,
      OptOutNewTaxRegime: regime === 'old' ? 'Y' : 'N',
    },
    [`${key}_IncomeDeductions`]: {
      GrossSalary: round(salary.gross),
      Salary: round(salary.basic + salary.allowances),
      PerquisitesValue: salary.perquisites,
      AllwncExemptUs10: round(breakdown.hraExemption),
      DeductionUnderSection16ia: round(breakdown.deductionsBreakdown.standardDeduction),
      IncomeFromSal: Math.max(
        round(breakdown.taxableSalaryIncome - breakdown.deductionsBreakdown.standardDeduction),
        0,
      ),
      TypeOfHP: input.houseProperty?.type === 'let-out' ? 'LOP' : 'SOP',
      TotalIncomeOfHP: houseProperty,
      IncomeOthSrc: round(otherSourcesTotal(input)),
      GrossTotIncome: round(breakdown.grossTotalIncome),
      DeductUndChapVIA: buildChapterVIA(breakdown),
      TotalIncome: round(breakdown.taxableIncome),
    },
    [`${key}_TaxComputation`]: {
      TotalTaxPayable: round(breakdown.taxBeforeRebate),
      Rebate87A: round(breakdown.rebate),
      TaxPayableOnRebate: round(breakdown.taxAfterRebate),
      Surcharge: round(breakdown.surcharge - breakdown.marginalRelief),
      EducationCess: round(breakdown.cess),
      GrossTaxLiability: round(breakdown.totalTaxLiability),
      NetTaxLiability: round(breakdown.totalTaxLiability),
      TotalIntrstPay: 0,
      TotalTaxPlusIntrstPay: round(breakdown.totalTaxLiability),
    },
    TaxPaid: buildTaxPaid(breakdown, input, options.taxesPaidBreakdown),
    Refund: buildRefund(normalisedTaxpayer, breakdown, input),
    Verification: buildVerification(normalisedTaxpayer, createdAt),
  };

  return { ITR: { [key]: body } };
}
