import { calculateIrelandTax } from './ireland';
import { calculateNetherlandsTax } from './netherlands';
import { calculateSingaporeTax } from './singapore';
import { calculateUkTax } from './uk';
import { calculateUsTax } from './us';
import { InternationalTaxCalculationInput, InternationalTaxResult } from '../types';

/**
 * Routes a resident individual estimate to the calculator for the country of tax residence. Each
 * country has a dedicated calculator covering its own income types, deductions/reliefs, credits
 * and social contributions.
 */
export function calculateInternationalTax(
  input: InternationalTaxCalculationInput,
): InternationalTaxResult {
  switch (input.country) {
    // Ireland: bonus, share income, pension relief, USC and PRSI.
    case 'ireland':
      return calculateIrelandTax(input);
    // The Netherlands: the 30% ruling, pension, the owner-occupied home, Box 2 and Box 3.
    case 'netherlands':
      return calculateNetherlandsTax(input);
    // The UK: savings and dividend income, pension and Gift Aid relief, NI and student loans.
    case 'uk':
      return calculateUkTax(input);
    // The US: filing status, adjustments, itemised deductions, capital gains and payroll taxes.
    case 'us':
      return calculateUsTax(input);
    // Singapore: personal reliefs, approved donations and the personal income tax rebate.
    case 'singapore':
      return calculateSingaporeTax(input);
  }
}
