import { describe, expect, it } from 'vitest';
import { calculateSlabTax } from '../src/calculators/slabTax';
import { getConfig } from '../src/config';

describe('calculateSlabTax', () => {
  it('returns 0 for zero or negative income', () => {
    const config = getConfig('FY2024-25');
    expect(calculateSlabTax(0, config.old.slabs.below60)).toBe(0);
    expect(calculateSlabTax(-1000, config.old.slabs.below60)).toBe(0);
  });

  it('computes old regime tax correctly for below-60 slabs', () => {
    const config = getConfig('FY2024-25');
    expect(calculateSlabTax(1000000, config.old.slabs.below60)).toBeCloseTo(112500);
    expect(calculateSlabTax(850000, config.old.slabs.below60)).toBeCloseTo(82500);
  });

  it('computes new regime tax correctly for FY2024-25 (below 7 slabs)', () => {
    const config = getConfig('FY2024-25');
    expect(calculateSlabTax(900000, config.new.slabs.below60)).toBeCloseTo(45000);
    expect(calculateSlabTax(1200000, config.new.slabs.below60)).toBeCloseTo(90000);
    expect(calculateSlabTax(1500000, config.new.slabs.below60)).toBeCloseTo(150000);
    expect(calculateSlabTax(2000000, config.new.slabs.below60)).toBeCloseTo(300000);
  });

  it('gives senior citizens (60-80) a higher basic exemption than below-60', () => {
    const config = getConfig('FY2024-25');
    const below60Tax = calculateSlabTax(600000, config.old.slabs.below60);
    const seniorTax = calculateSlabTax(600000, config.old.slabs['60to80']);
    expect(below60Tax).toBeCloseTo(32500);
    expect(seniorTax).toBeCloseTo(30000);
    expect(seniorTax).toBeLessThan(below60Tax);
  });

  it('gives super senior citizens (80+) the highest basic exemption', () => {
    const config = getConfig('FY2024-25');
    const superSeniorTax = calculateSlabTax(600000, config.old.slabs.above80);
    expect(superSeniorTax).toBeCloseTo(20000);
  });

  it('computes new regime FY2025-26 revised slabs correctly', () => {
    const config = getConfig('FY2025-26');
    expect(calculateSlabTax(1200000, config.new.slabs.below60)).toBeCloseTo(60000);
    expect(calculateSlabTax(2400000, config.new.slabs.below60)).toBeCloseTo(300000);
  });
});
