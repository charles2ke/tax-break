export type AssessmentYear = 'FY2021-22' | 'FY2022-23' | 'FY2023-24' | 'FY2024-25' | 'FY2025-26';

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

/** Two-letter postal codes for the 50 US states plus the District of Columbia. */
export type UsState =
  | 'AL'
  | 'AK'
  | 'AZ'
  | 'AR'
  | 'CA'
  | 'CO'
  | 'CT'
  | 'DE'
  | 'DC'
  | 'FL'
  | 'GA'
  | 'HI'
  | 'ID'
  | 'IL'
  | 'IN'
  | 'IA'
  | 'KS'
  | 'KY'
  | 'LA'
  | 'ME'
  | 'MD'
  | 'MA'
  | 'MI'
  | 'MN'
  | 'MS'
  | 'MO'
  | 'MT'
  | 'NE'
  | 'NV'
  | 'NH'
  | 'NJ'
  | 'NM'
  | 'NY'
  | 'NC'
  | 'ND'
  | 'OH'
  | 'OK'
  | 'OR'
  | 'PA'
  | 'RI'
  | 'SC'
  | 'SD'
  | 'TN'
  | 'TX'
  | 'UT'
  | 'VT'
  | 'VA'
  | 'WA'
  | 'WV'
  | 'WI'
  | 'WY';

type InternationalTaxCalculationBase = {
  /**
   * Annual gross income in the country's local currency. For Ireland this is the basic salary
   * only; bonus, benefits in kind, share income and other income are supplied separately.
   */
  annualIncome: number;
};

/** Personal circumstances that set the Irish standard rate cut-off point and personal tax credit. */
export type IrelandFilingStatus =
  'single' | 'singleParent' | 'marriedOneIncome' | 'marriedTwoIncomes';

/** Age band that caps the age-related percentage limit on Irish pension contribution relief. */
export type IrelandPensionAgeBand =
  'under30' | '30to39' | '40to49' | '50to54' | '55to59' | '60plus';

/** Share awards vested and shares disposed of during the year. */
export interface IrelandShareInput {
  /**
   * Market value on vesting of share awards (RSUs). Taxed as employment income through payroll
   * (income tax, USC and PRSI).
   */
  rsuVestedValue?: number;
  /** Gross proceeds from shares sold during the year. */
  shareSaleProceeds?: number;
  /**
   * Base cost of the shares sold plus incidental costs of acquisition/disposal. For RSUs this is
   * normally the market value already taxed on vesting.
   */
  shareSaleCost?: number;
  /** Allowable capital losses carried forward from earlier years. */
  capitalLossesForward?: number;
}

/** Detailed Irish PAYE inputs. Every field other than `annualIncome` is optional. */
export type IrelandTaxCalculationInput = InternationalTaxCalculationBase & {
  country: 'ireland';
  /** Annual performance/commission bonus paid during the year. */
  bonus?: number;
  /** Notional pay from taxable benefits in kind (company car, health insurance paid by employer). */
  taxableBenefits?: number;
  /** Non-PAYE income such as rental profit, dividends or freelance income. */
  otherIncome?: number;
  /** Employee pension/PRSA/AVC contributions eligible for income tax relief. */
  pensionContributions?: number;
  /** Age band on 31 December, used for the age-related pension relief limit. */
  pensionAgeBand?: IrelandPensionAgeBand;
  /** Personal circumstances. Defaults to `single`. */
  filingStatus?: IrelandFilingStatus;
  /** Lower earner income (you or spouse/civil partner), used to extend the jointly assessed cut-off point. */
  spouseIncome?: number;
  shares?: IrelandShareInput;
  /** Qualifying non-routine medical expenses, relieved at 20%. */
  medicalExpenses?: number;
  /** Rent paid on a principal private residence, relieved at 20% up to the rent tax credit cap. */
  rentPaid?: number;
  state?: never;
};

/** Owner-occupied home (eigen woning) details feeding the Dutch Box 1 calculation. */
export interface NetherlandsHomeInput {
  /** WOZ value of your owner-occupied home, used for the notional rental value (eigenwoningforfait). */
  wozValue?: number;
  /** Deductible mortgage interest paid on the loan for your owner-occupied home. */
  mortgageInterest?: number;
}

/** Box 3 assets and debts on 1 January (peildatum). */
export interface NetherlandsBox3Input {
  /** Bank and savings balances. */
  savings?: number;
  /** Investments, second properties and other assets. */
  investments?: number;
  /** Debts other than the mortgage on your owner-occupied home. */
  debts?: number;
}

/** Detailed Dutch inputs. Every field other than `annualIncome` is optional. */
export type NetherlandsTaxCalculationInput = InternationalTaxCalculationBase & {
  country: 'netherlands';
  /** Holiday allowance (vakantiegeld), normally 8% of gross salary. */
  holidayAllowance?: number;
  /** Bonus, commission or 13th month paid during the year. */
  bonus?: number;
  /** Taxable benefits such as the company car addition (bijtelling). */
  taxableBenefits?: number;
  /** Other Box 1 income such as freelance profit or alimony received. */
  otherIncome?: number;
  /** Employee pension contributions deductible from Box 1 income. */
  pensionContributions?: number;
  /** Whether the 30% ruling (30%-regeling) applies to your employment income. */
  thirtyPercentRuling?: boolean;
  /** Whether you have a fiscal partner, which doubles the Box 3 tax-free allowance. */
  fiscalPartner?: boolean;
  home?: NetherlandsHomeInput;
  box3?: NetherlandsBox3Input;
  /** Box 2 income from a substantial interest (dividends from a 5%+ shareholding). */
  box2Income?: number;
  /** Other personal deductions (aftrekposten) such as donations or specific healthcare costs. */
  otherDeductions?: number;
  state?: never;
};

/** Student loan repayment plan used for the UK payroll deduction. */
export type UkStudentLoanPlan =
  | 'none'
  | 'plan1'
  | 'plan2'
  | 'plan4'
  | 'plan5'
  | 'postgraduate';

/** Detailed UK (England, Wales and Northern Ireland) inputs. Only `annualIncome` is required. */
export type UkTaxCalculationInput = InternationalTaxCalculationBase & {
  country: 'uk';
  /** Bonus or commission paid through payroll during the tax year. */
  bonus?: number;
  /** Taxable benefits in kind reported on a P11D (company car, medical insurance). */
  taxableBenefits?: number;
  /** Profit from self-employment or freelancing, taxed as non-savings income. */
  selfEmploymentIncome?: number;
  /** Net profit from property let out during the year. */
  rentalIncome?: number;
  /** Interest from bank accounts, gilts and other savings. */
  savingsInterest?: number;
  /** Dividends received from company shares and funds. */
  dividendIncome?: number;
  /** Employee pension contributions relieved against income (net pay or relief at source). */
  pensionContributions?: number;
  /** Gift Aid donations, entered gross, which extend the basic and higher rate bands. */
  giftAidDonations?: number;
  /** Student loan plan repaid through payroll. Defaults to `none`. */
  studentLoanPlan?: UkStudentLoanPlan;
  state?: never;
};

/** US federal filing status. */
export type UsFilingStatus = 'single' | 'marriedJoint' | 'marriedSeparate' | 'headOfHousehold';

/** Detailed US inputs. Only `annualIncome` (wages) is required. */
export type UsTaxCalculationInput = InternationalTaxCalculationBase & {
  country: 'us';
  /** Filing status used for the standard deduction, brackets and thresholds. Defaults to `single`. */
  filingStatus?: UsFilingStatus;
  /** Bonus and other supplemental wages included on your W-2. */
  bonus?: number;
  /** Net profit from self-employment, subject to self-employment tax. */
  selfEmploymentIncome?: number;
  /** Taxable interest income. */
  interestIncome?: number;
  /** Ordinary (non-qualified) dividends taxed at ordinary rates. */
  ordinaryDividends?: number;
  /** Qualified dividends taxed at the preferential long-term capital gains rates. */
  qualifiedDividends?: number;
  /** Net short-term capital gains, taxed at ordinary rates. */
  shortTermCapitalGains?: number;
  /** Net long-term capital gains, taxed at the preferential rates. */
  longTermCapitalGains?: number;
  /** Other taxable income such as rental profit or taxable retirement distributions. */
  otherIncome?: number;
  /** Pre-tax traditional 401(k)/403(b)/IRA contributions deducted from taxable wages. */
  retirementContributions?: number;
  /** Pre-tax HSA contributions. */
  hsaContributions?: number;
  /** Student loan interest paid, deductible above the line up to $2,500. */
  studentLoanInterest?: number;
  /** Total itemised deductions; used when they exceed the standard deduction. */
  itemizedDeductions?: number;
  /** Qualifying children under 17 for the child tax credit. */
  dependentsUnder17?: number;
  /** Other dependants qualifying for the $500 credit for other dependents. */
  otherDependents?: number;
  /**
   * State of residence, used to estimate state income tax on top of the federal liability.
   * Omit for a federal-only estimate.
   */
  state?: UsState;
};

/** Age band on 31 December that sets the Singapore earned income relief. */
export type SingaporeAgeBand = 'below55' | '55to59' | '60plus';

/** Personal reliefs claimed on a Singapore individual income tax return. */
export interface SingaporeReliefsInput {
  /** Compulsory employee CPF contributions on Singapore employment income. */
  cpfContributions?: number;
  /** Cash top-ups to your own or a family member's CPF Retirement/Special Account. */
  cpfCashTopUp?: number;
  /** Contributions to the Supplementary Retirement Scheme. */
  srsContributions?: number;
  /** Claim the $2,000 spouse relief. */
  spouseRelief?: boolean;
  /** Number of children claimed for Qualifying Child Relief ($4,000 each). */
  qualifyingChildren?: number;
  /** Number of dependant parents claimed for parent relief ($9,000 each, living with you). */
  dependantParents?: number;
  /** Claim the $3,000 NSman (self) relief. */
  nsmanRelief?: boolean;
  /** Course fees paid for approved courses, relieved up to $5,500. */
  courseFees?: number;
  /** Life insurance premiums, relieved only when CPF contributions are below $5,000. */
  lifeInsurancePremiums?: number;
  /** Employed domestic worker levy, foreign maid levy relief. */
  foreignMaidLevy?: number;
}

/** Detailed Singapore inputs. Only `annualIncome` (employment income) is required. */
export type SingaporeTaxCalculationInput = InternationalTaxCalculationBase & {
  country: 'singapore';
  /** Bonus, commission or AWS paid during the year. */
  bonus?: number;
  /** Director's fees approved during the year. */
  directorsFees?: number;
  /** Taxable benefits in kind such as accommodation or a car provided by your employer. */
  taxableBenefits?: number;
  /** Net rental income from property after deductible expenses. */
  rentalIncome?: number;
  /** Trade, business or other taxable income. */
  otherIncome?: number;
  /** Employment expenses incurred wholly in producing your employment income. */
  employmentExpenses?: number;
  /** Cash donations to approved Institutions of a Public Character (250% deduction). */
  approvedDonations?: number;
  /** Age band on 31 December, used for the earned income relief. Defaults to `below55`. */
  ageBand?: SingaporeAgeBand;
  reliefs?: SingaporeReliefsInput;
  state?: never;
};

export type InternationalTaxCalculationInput =
  | UsTaxCalculationInput
  | UkTaxCalculationInput
  | SingaporeTaxCalculationInput
  | IrelandTaxCalculationInput
  | NetherlandsTaxCalculationInput;

interface InternationalTaxResultBase {
  currency: string;
  grossIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  /** Slab/bracket tax before any non-refundable tax credits (federal tax for the US). */
  incomeTax: number;
  /** Non-refundable tax credits applied against the slab tax (0 when not modelled). */
  taxCredits: number;
  totalTaxLiability: number;
  effectiveTaxRate: number;
}

/** Irish-specific components of the estimate, in euros. */
export interface IrelandTaxBreakdown {
  /** Salary + bonus + benefits in kind + share award vesting value. */
  employmentIncome: number;
  /** Market value of share awards that vested and were taxed as employment income. */
  shareVestingIncome: number;
  /** Non-PAYE income included in the assessment. */
  otherIncome: number;
  /** Pension contributions actually relieved after the age-related and earnings caps. */
  pensionRelief: number;
  /** Income taxed at the 20% standard rate; the balance is taxed at 40%. */
  standardRateCutOff: number;
  /** Universal Social Charge on gross income (no pension relief applies). */
  universalSocialCharge: number;
  /** Class A employee PRSI. */
  prsi: number;
  /** Chargeable gain on shares sold, after allowable costs and losses forward. */
  capitalGain: number;
  /** Chargeable gain after the annual personal CGT exemption. */
  taxableCapitalGain: number;
  /** Capital gains tax at 33% on the taxable gain. */
  capitalGainsTax: number;
  /** Total income and gains less all taxes above. */
  netIncome: number;
}

/** Dutch components of the estimate, in euros. */
export interface NetherlandsTaxBreakdown {
  /** Salary + holiday allowance + bonus + taxable benefits. */
  employmentIncome: number;
  /** Employment income left untaxed by the 30% ruling. */
  thirtyPercentExemption: number;
  /** Employment income actually subject to tax after the 30% ruling. */
  taxableEmploymentIncome: number;
  /** Other Box 1 income included in the assessment. */
  otherIncome: number;
  /** Employee pension contributions deducted from Box 1 income. */
  pensionDeduction: number;
  /** Notional rental value of the owner-occupied home added to Box 1 income. */
  eigenwoningforfait: number;
  /** Mortgage interest deducted from Box 1 income. */
  mortgageInterestDeduction: number;
  /** Other personal deductions (aftrekposten) allowed against Box 1 income. */
  otherDeductions: number;
  /**
   * Tax added back because mortgage interest and personal deductions are only relieved at the
   * second-bracket rate (tariefsaanpassing) instead of the top rate.
   */
  deductionRateAdjustment: number;
  /** Taxable Box 1 income (work and home). */
  box1Income: number;
  /** Box 1 tax including the deduction rate adjustment, before tax credits. */
  box1Tax: number;
  /** General tax credit (algemene heffingskorting) before the non-refundable cap. */
  generalTaxCredit: number;
  /** Labour tax credit (arbeidskorting) before the non-refundable cap. */
  labourTaxCredit: number;
  /** Box 2 income from a substantial interest. */
  box2Income: number;
  /** Box 2 tax on substantial-interest income. */
  box2Tax: number;
  /** Box 3 assets less deductible debts on 1 January. */
  box3Assets: number;
  /** Box 3 tax-free allowance (heffingsvrij vermogen), doubled for fiscal partners. */
  box3TaxFreeAllowance: number;
  /** Deemed return on Box 3 assets after the tax-free allowance. */
  box3DeemedReturn: number;
  /** Box 3 tax on the deemed return. */
  box3Tax: number;
  /** Total income (including the 30% ruling exemption and Box 2 income) less all taxes above. */
  netIncome: number;
}

/** UK components of the estimate, in pounds. */
export interface UkTaxBreakdown {
  /** Salary + bonus + taxable benefits in kind. */
  employmentIncome: number;
  /** Self-employment profit and rental profit taxed as non-savings income. */
  otherNonSavingsIncome: number;
  /** Interest from savings included in the assessment. */
  savingsInterest: number;
  /** Dividends included in the assessment. */
  dividendIncome: number;
  /** Pension contributions relieved against income. */
  pensionRelief: number;
  /** Gross Gift Aid donations that extend the rate bands. */
  giftAidDonations: number;
  /** Income used to taper the personal allowance. */
  adjustedNetIncome: number;
  /** Personal allowance after the £100,000 taper. */
  personalAllowance: number;
  /** Starting rate for savings actually available (0% band). */
  startingRateForSavings: number;
  /** Personal savings allowance available at your highest rate. */
  personalSavingsAllowance: number;
  /** Dividend allowance (0% band) available. */
  dividendAllowance: number;
  /** Upper limit of the basic rate band after any Gift Aid extension. */
  basicRateLimit: number;
  /** Tax on non-savings income at 20%/40%/45%. */
  nonSavingsTax: number;
  /** Tax on savings interest above the 0% bands. */
  savingsTax: number;
  /** Tax on dividends above the dividend allowance. */
  dividendTax: number;
  /** Class 1 employee National Insurance on salary and bonus. */
  nationalInsurance: number;
  /** Student loan (and postgraduate loan) repayments deducted through payroll. */
  studentLoanRepayment: number;
  /** Total income less income tax, National Insurance and student loan repayments. */
  netIncome: number;
}

/** US components of the estimate, in dollars. */
export interface UsTaxBreakdown {
  /** Filing status the estimate was produced for. */
  filingStatus: UsFilingStatus;
  /** Wages, bonus and other ordinary income before adjustments. */
  ordinaryIncome: number;
  /** Qualified dividends and net long-term capital gains taxed at preferential rates. */
  preferentialIncome: number;
  /** Above-the-line adjustments (retirement, HSA, student loan interest, half of SE tax). */
  adjustments: number;
  /** Adjusted gross income. */
  adjustedGrossIncome: number;
  /** Standard deduction for the filing status. */
  standardDeduction: number;
  /** Itemised deductions claimed, when higher than the standard deduction. */
  itemizedDeductions: number;
  /** Deduction actually used (the greater of the standard and itemised deductions). */
  deductionUsed: number;
  /** Taxable income taxed at ordinary rates. */
  ordinaryTaxableIncome: number;
  /** Tax on ordinary taxable income. */
  ordinaryTax: number;
  /** Tax on qualified dividends and long-term gains at 0%/15%/20%. */
  capitalGainsTax: number;
  /** Child tax credit and credit for other dependants, after the income phase-out. */
  childTaxCredit: number;
  /** Social Security and Medicare tax withheld on wages. */
  ficaTax: number;
  /** Self-employment tax on net self-employment earnings. */
  selfEmploymentTax: number;
  /** Additional Medicare tax of 0.9% on earnings above the threshold. */
  additionalMedicareTax: number;
  /** Net investment income tax of 3.8%. */
  netInvestmentIncomeTax: number;
  /** Total income less all federal and state taxes above. */
  netIncome: number;
}

/** Singapore components of the estimate, in Singapore dollars. */
export interface SingaporeTaxBreakdown {
  /** Salary + bonus + director's fees + taxable benefits in kind. */
  employmentIncome: number;
  /** Rental profit and other taxable income. */
  otherIncome: number;
  /** Employment expenses deducted from employment income. */
  employmentExpenses: number;
  /** Deduction for approved donations, at 250% of the amount given. */
  donationDeduction: number;
  /** Assessable income after expenses and donations. */
  assessableIncome: number;
  /** Earned income relief based on your age band. */
  earnedIncomeRelief: number;
  /** CPF and SRS reliefs allowed. */
  cpfAndSrsRelief: number;
  /** Family reliefs (spouse, children, parents). */
  familyRelief: number;
  /** Other reliefs such as NSman, course fees, life insurance and the maid levy. */
  otherRelief: number;
  /** Total personal reliefs claimed before the $80,000 cap. */
  totalReliefsBeforeCap: number;
  /** Personal reliefs actually allowed after the $80,000 cap. */
  totalReliefsAllowed: number;
  /** Chargeable income after reliefs. */
  chargeableIncome: number;
  /** Personal income tax rebate for the year of assessment. */
  taxRebate: number;
  /** Total income less tax payable. */
  netIncome: number;
}

/** Country-specific breakdown keys that are absent on results for other countries. */
type OtherBreakdowns<K extends 'ireland' | 'netherlands' | 'uk' | 'us' | 'singapore'> = {
  [P in Exclude<'ireland' | 'netherlands' | 'uk' | 'us' | 'singapore', K>]?: never;
};

type NoStateFields = {
  state?: never;
  stateTax?: never;
  stateTaxableIncome?: never;
};

export type InternationalTaxResult =
  | (InternationalTaxResultBase &
      NoStateFields &
      OtherBreakdowns<'ireland'> & {
        country: 'ireland';
        ireland: IrelandTaxBreakdown;
      })
  | (InternationalTaxResultBase &
      NoStateFields &
      OtherBreakdowns<'netherlands'> & {
        country: 'netherlands';
        netherlands: NetherlandsTaxBreakdown;
      })
  | (InternationalTaxResultBase &
      NoStateFields &
      OtherBreakdowns<'uk'> & {
        country: 'uk';
        uk: UkTaxBreakdown;
      })
  | (InternationalTaxResultBase &
      NoStateFields &
      OtherBreakdowns<'singapore'> & {
        country: 'singapore';
        singapore: SingaporeTaxBreakdown;
      })
  | (InternationalTaxResultBase &
      OtherBreakdowns<'us'> & {
        country: 'us';
        /** The state of residence the state tax was estimated for. */
        state?: UsState;
        /** Estimated state income tax. */
        stateTax?: number;
        /** Income subject to state income tax after the state deduction/exemption. */
        stateTaxableIncome?: number;
        us: UsTaxBreakdown;
      });

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
  /**
   * When true, marginal relief applies just above the income limit so that income tax (before cess)
   * never exceeds the income earned in excess of that limit (new regime, FY 2023-24 onwards).
   */
  marginalRelief?: boolean;
}

export interface RegimeConfig {
  slabs: Record<AgeCategory, SlabBracket[]>;
  standardDeduction: number;
  rebate87A: RebateConfig;
  surchargeSlabs: SurchargeSlab[];
  cessRate: number;
}

export interface CapitalGainsRates {
  /** Section 111A - STCG on listed equity shares / equity-oriented mutual funds (STT paid). */
  equitySTCGRate: number;
  /** Section 112A - LTCG on listed equity shares / equity-oriented mutual funds (STT paid). */
  equityLTCGRate: number;
  /** Annual exemption available on Section 112A LTCG. */
  equityLTCGExemption: number;
  /** Section 112 - LTCG on other assets (debt funds, property, unlisted shares, etc). */
  otherLTCGRate: number;
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
  capitalGains: CapitalGainsRates;
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
