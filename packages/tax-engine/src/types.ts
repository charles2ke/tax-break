export type AssessmentYear = 'FY2024-25' | 'FY2025-26';

export type TaxCountry = 'india' | 'ireland' | 'netherlands' | 'uk' | 'us' | 'singapore';

export type AgeCategory = 'below60' | '60to80' | 'above80';

export type Regime = 'old' | 'new';

export type CityType = 'metro' | 'non-metro';

export type HousePropertyType = 'self-occupied' | 'let-out';

export interface SalaryIncomeInput {
  basic: number;
  hraReceived: number;
  rentPaid: number;
  cityType: CityType;
  lta: number;
  specialAllowance: number;
  /** Any other taxable components of salary not covered above. */
  otherTaxableAllowances?: number;
}

export interface HousePropertyInput {
  type: HousePropertyType;
  /** Interest paid on home loan for the year. */
  homeLoanInterest?: number;
  /** Annual rent received, only relevant when type is 'let-out'. */
  annualRentReceived?: number;
  /** Municipal taxes paid, only relevant when type is 'let-out'. */
  municipalTaxesPaid?: number;
}

export interface OtherIncomeInput {
  /** Interest earned from savings bank accounts. */
  savingsInterest?: number;
  /** Interest earned from fixed/recurring deposits and other sources. */
  otherInterest?: number;
  dividendIncome?: number;
  otherIncome?: number;
}

export interface Section80DInput {
  selfAndFamilyPremium?: number;
  parentsPremium?: number;
  selfSenior?: boolean;
  parentsSenior?: boolean;
}

export interface DeductionsInput {
  section80C?: number;
  section80D?: Section80DInput;
  section80CCD1B?: number;
  /** Section 80E - education loan interest, no cap. */
  section80E?: number;
  /** Section 80G - donations, simplified as user entered eligible amount. */
  section80G?: number;
}

export interface CapitalGainsInput {
  /** Section 111A - STCG on listed equity shares / equity-oriented mutual funds (STT paid). */
  equitySTCG?: number;
  /** Section 112A - LTCG on listed equity shares / equity-oriented mutual funds (STT paid). */
  equityLTCG?: number;
  /** STCG on other assets (debt funds, property, unlisted shares) - taxed at slab rates. */
  otherSTCG?: number;
  /** Section 112 - LTCG on other assets (debt funds, property, unlisted shares, etc). */
  otherLTCG?: number;
}

export interface TaxCalculationInput {
  assessmentYear: AssessmentYear;
  ageCategory: AgeCategory;
  salary?: SalaryIncomeInput;
  houseProperty?: HousePropertyInput;
  otherIncome?: OtherIncomeInput;
  deductions?: DeductionsInput;
  capitalGains?: CapitalGainsInput;
  /** Additional income sources used only for ITR form recommendation, not tax calculation. */
  otherIncomeSources?: ItrRecommenderInput;
  /** Tax already paid via TDS/TCS/self-assessment, used for advance tax computation. */
  taxAlreadyPaid?: number;
}

export interface InternationalTaxCalculationInput {
  country: Exclude<TaxCountry, 'india'>;
  /** Annual gross income in the country's local currency. */
  annualIncome: number;
}

export interface InternationalTaxResult {
  country: Exclude<TaxCountry, 'india'>;
  currency: string;
  grossIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  incomeTax: number;
  totalTaxLiability: number;
  effectiveTaxRate: number;
}

export interface SlabBracket {
  /** Lower bound of the bracket (inclusive). */
  from: number;
  /** Upper bound of the bracket (exclusive), or null for no upper bound. */
  to: number | null;
  rate: number;
}

export interface SurchargeSlab {
  /** Taxable income threshold above which this surcharge rate applies. */
  threshold: number;
  rate: number;
}

export interface RebateConfig {
  /** Taxable income limit up to which full rebate (nil tax) is available. */
  incomeLimit: number;
  /** Maximum rebate amount available under section 87A. */
  maxAmount: number;
}

export interface RegimeConfig {
  slabs: Record<AgeCategory, SlabBracket[]>;
  standardDeduction: number;
  rebate87A: RebateConfig;
  surchargeSlabs: SurchargeSlab[];
  cessRate: number;
}

export interface AssessmentYearConfig {
  assessmentYear: AssessmentYear;
  label: string;
  old: RegimeConfig;
  new: RegimeConfig;
  section80C: { cap: number };
  section80CCD1B: { cap: number };
  section80D: {
    selfAndFamilyCap: number;
    selfAndFamilySeniorCap: number;
    parentsCap: number;
    parentsSeniorCap: number;
  };
  section80TTA: { cap: number };
  section80TTB: { cap: number };
  homeLoanInterestCap: { selfOccupied: number };
}

export interface HraExemptionResult {
  actualHraReceived: number;
  rentMinusTenPercentBasic: number;
  metroLimit: number;
  exemptAmount: number;
  taxableHra: number;
}

export interface HousePropertyResult {
  netAnnualValue: number;
  standardDeductionOnNav: number;
  interestDeduction: number;
  incomeFromHouseProperty: number;
}

export interface DeductionsBreakdown {
  section80C: number;
  section80D: number;
  section80CCD1B: number;
  section80TTA_TTB: number;
  section80E: number;
  section80G: number;
  standardDeduction: number;
  total: number;
}

export interface CapitalGainsBreakdown {
  equitySTCG: number;
  equityLTCG: number;
  otherSTCG: number;
  otherLTCG: number;
  equitySTCGTax: number;
  equityLTCGExemptionUsed: number;
  equityLTCGTax: number;
  otherLTCGTax: number;
  otherSTCGAddedToIncome: number;
  totalCapitalGainsTax: number;
  totalCapitalGainsIncome: number;
}

export interface TaxBreakdown {
  regime: Regime;
  grossTotalIncome: number;
  totalDeductions: number;
  deductionsBreakdown: DeductionsBreakdown;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  taxAfterRebate: number;
  surcharge: number;
  marginalRelief: number;
  cess: number;
  capitalGains: CapitalGainsBreakdown;
  totalTaxLiability: number;
  effectiveTaxRate: number;
}

export interface RegimeComparisonResult {
  old: TaxBreakdown;
  new: TaxBreakdown;
  recommendedRegime: Regime;
  savings: number;
}

/** Quarterly advance tax installment schedule per Section 211. */
export interface AdvanceTaxInstallment {
  label: string;
  dueDate: string;
  cumulativePercentage: number;
  cumulativeAmountDue: number;
  amountDueThisInstallment: number;
}

export interface AdvanceTaxResult {
  totalTaxLiability: number;
  taxAlreadyPaid: number;
  netTaxPayable: number;
  advanceTaxApplicable: boolean;
  installments: AdvanceTaxInstallment[];
  interestSection234B: number;
  interestSection234C: number;
  totalInterest: number;
}

export type ItrForm = 'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4';

export interface ItrRecommenderInput {
  hasSalaryIncome?: boolean;
  hasSingleHouseProperty?: boolean;
  hasMultipleHouseProperties?: boolean;
  hasCapitalGains?: boolean;
  hasBusinessOrProfessionIncome?: boolean;
  isPresumptiveTaxationScheme?: boolean;
  hasForeignAssetsOrIncome?: boolean;
  isCompanyDirector?: boolean;
  hasUnlistedEquityShares?: boolean;
  totalIncome?: number;
  isResidentIndividual?: boolean;
}

export interface ItrRecommendation {
  recommendedForm: ItrForm;
  reasons: string[];
}
