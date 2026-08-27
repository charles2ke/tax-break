import { describe, expect, it } from 'vitest';
import { calculateSurcharge } from '../src/calculators/surcharge';
import { calculateSlabTax } from '../src/calculators/slabTax';
import { getConfig } from '../src/config';

describe('calculateSurcharge', () => {
  const config = getConfig('FY2024-25');
  const slabs = config.old.slabs.below60;

  it('applies no surcharge below the 50,00,000 threshold', () => {
    const tax = calculateSlabTax(4000000, slabs);
    const result = calculateSurcharge(4000000, tax, config.old.surchargeSlabs, slabs);
    expect(result.surcharge).toBe(0);
    expect(result.rate).toBe(0);
  });

  it('applies marginal relief just above the 50,00,000 threshold so surcharge is minimal', () => {
    const taxableIncome = 5000001;
    const tax = calculateSlabTax(taxableIncome, slabs);
    const result = calculateSurcharge(taxableIncome, tax, config.old.surchargeSlabs, slabs);
    // Marginal relief should ensure total tax increase over the threshold roughly equals the
    // extra rupee of income, so the surcharge itself should be a small fraction of a rupee.
    expect(result.surcharge).toBeGreaterThanOrEqual(0);
    expect(result.surcharge).toBeLessThan(1);
    expect(result.marginalRelief).toBeGreaterThan(0);
  });

  it('applies full 10% surcharge well above the 50,00,000 threshold with no relief needed', () => {
    const taxableIncome = 6000000;
    const tax = calculateSlabTax(taxableIncome, slabs);
    const result = calculateSurcharge(taxableIncome, tax, config.old.surchargeSlabs, slabs);
    expect(result.surcharge).toBeCloseTo(161250);
    expect(result.marginalRelief).toBeCloseTo(0);
  });

  it('applies 15% surcharge for taxable income above 1 crore', () => {
    const taxableIncome = 15000000;
    const tax = calculateSlabTax(taxableIncome, slabs);
    const result = calculateSurcharge(taxableIncome, tax, config.old.surchargeSlabs, slabs);
    expect(result.rate).toBe(0.15);
  });

  it('applies 37% surcharge above 5 crore under the old regime', () => {
    const taxableIncome = 60000000;
    const tax = calculateSlabTax(taxableIncome, slabs);
    const result = calculateSurcharge(taxableIncome, tax, config.old.surchargeSlabs, slabs);
    expect(result.rate).toBe(0.37);
  });

  it('caps surcharge at 25% under the new regime even above 5 crore', () => {
    const newSlabs = config.new.slabs.below60;
    const taxableIncome = 60000000;
    const tax = calculateSlabTax(taxableIncome, newSlabs);
    const result = calculateSurcharge(taxableIncome, tax, config.new.surchargeSlabs, newSlabs);
    expect(result.rate).toBe(0.25);
  });
});
