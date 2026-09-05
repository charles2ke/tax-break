import type { TaxCountry } from '@tax-break/tax-engine';

export interface CountryOption {
  value: TaxCountry;
  label: string;
  flag: string;
  currency: string;
  /** One-line summary of what the calculator does for this country. */
  tagline: string;
  /** Bullet points shown on the landing page. */
  features: string[];
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    value: 'india',
    label: 'India',
    flag: '🇮🇳',
    currency: '₹ INR',
    tagline: 'Full Old vs New Regime comparison with deductions and capital gains.',
    features: [
      'Old vs New Regime comparison with a recommendation',
      'FY 2021-22 to FY 2025-26 slab rates',
      'HRA exemption and house property (self-occupied or let-out)',
      '80C, 80D, 80CCD(1B), 80TTA/80TTB, 80E and 80G deductions',
      'Capital gains under Sections 111A, 112A and 112',
      'Form 26AS upload that pre-fills your income and TDS',
    ],
  },
  {
    value: 'ireland',
    label: 'Ireland',
    flag: '🇮🇪',
    currency: '€ EUR',
    tagline: 'Detailed PAYE estimate including USC, PRSI, RSUs and pension relief.',
    features: [
      'Income tax at 20%/40% with your standard rate cut-off point',
      'USC and PRSI on all payroll income',
      'RSU vesting taxed as pay, share sales at 33% CGT',
      'Age-related pension/AVC relief',
      'Medical expenses and rent tax credits',
    ],
  },
  {
    value: 'netherlands',
    label: 'Netherlands',
    flag: '🇳🇱',
    currency: '€ EUR',
    tagline: 'Box 1, 2 and 3 estimate with the 30% ruling and your own home.',
    features: [
      'Box 1 payroll income including holiday allowance and bonus',
      '30% ruling (30%-regeling) applied to employment income',
      'Owner-occupied home: eigenwoningforfait and mortgage interest',
      'Box 2 substantial interest income',
      'Box 3 deemed return on savings, investments and debts',
    ],
  },
  {
    value: 'uk',
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: '£ GBP',
    tagline: 'Detailed 2025/26 estimate with savings, dividends, NI and student loans.',
    features: [
      'Personal allowance taper and basic/higher/additional rate bands',
      'Savings starting rate, personal savings and dividend allowances',
      'Pension and Gift Aid relief that widen your rate bands',
      'Class 1 employee National Insurance',
      'Student loan and postgraduate loan repayments',
    ],
  },
  {
    value: 'us',
    label: 'United States',
    flag: '🇺🇸',
    currency: '$ USD',
    tagline: 'Federal tax for your filing status plus the income tax of your state.',
    features: [
      'All four filing statuses with 2025 brackets and standard deductions',
      'Standard or itemised deductions and above-the-line adjustments',
      'Qualified dividends and long-term gains at 0%/15%/20%',
      'Child tax credit, payroll, self-employment and net investment income taxes',
      'State income tax for all 50 states and DC',
    ],
  },
  {
    value: 'singapore',
    label: 'Singapore',
    flag: '🇸🇬',
    currency: 'S$ SGD',
    tagline: 'YA 2025 estimate with personal reliefs, donations and the tax rebate.',
    features: [
      'Resident progressive rates from 0% to 24%',
      'Employment, director fee, rental and other income',
      'Earned income, CPF, SRS and family reliefs with the $80,000 cap',
      '250% deduction for approved donations',
      'Personal income tax rebate of 60%, capped at $200',
    ],
  },
];

export function getCountryOption(country: TaxCountry): CountryOption {
  return COUNTRY_OPTIONS.find((option) => option.value === country) ?? COUNTRY_OPTIONS[0];
}
