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
    tagline: 'Simplified estimate of UK income tax for a resident individual.',
    features: [
      'Personal allowance and basic/higher/additional rate bands',
      'Quick estimate from a single gross income figure',
    ],
  },
  {
    value: 'us',
    label: 'United States',
    flag: '🇺🇸',
    currency: '$ USD',
    tagline: 'Federal tax for a single filer plus the income tax of your state.',
    features: [
      'Federal standard deduction and bracket calculation',
      'State income tax for all 50 states and DC',
      'Flat, graduated and no-income-tax states supported',
    ],
  },
  {
    value: 'singapore',
    label: 'Singapore',
    flag: '🇸🇬',
    currency: 'S$ SGD',
    tagline: 'Simplified estimate of Singapore resident income tax.',
    features: [
      'Resident progressive rates from 0% to 24%',
      'Quick estimate from a single gross income figure',
    ],
  },
];

export function getCountryOption(country: TaxCountry): CountryOption {
  return COUNTRY_OPTIONS.find((option) => option.value === country) ?? COUNTRY_OPTIONS[0];
}
