import { SlabBracket } from '../types';

/**
 * Computes tax on the given taxable income using the provided slab brackets.
 */
export function calculateSlabTax(taxableIncome: number, slabs: SlabBracket[]): number {
  const income = Math.max(0, taxableIncome);
  let tax = 0;

  for (const bracket of slabs) {
    if (income <= bracket.from) break;
    const upper = bracket.to === null ? income : Math.min(income, bracket.to);
    const taxableInBracket = Math.max(0, upper - bracket.from);
    tax += taxableInBracket * bracket.rate;
  }

  return tax;
}
