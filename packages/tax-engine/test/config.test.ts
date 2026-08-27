import { describe, expect, it } from 'vitest';
import { assessmentYearConfigs, getConfig, listAssessmentYears } from '../src/config';
import { AssessmentYear } from '../src/types';

describe('assessment year configs', () => {
  const years: AssessmentYear[] = [
    'FY2021-22',
    'FY2022-23',
    'FY2023-24',
    'FY2024-25',
    'FY2025-26',
  ];

  it('covers the current year plus the previous four financial years', () => {
    expect(listAssessmentYears()).toEqual(years);
  });

  it('exposes a label, slabs and capital gains rates for every year', () => {
    for (const year of years) {
      const config = getConfig(year);
      expect(config.assessmentYear).toBe(year);
      expect(config.label).toMatch(/^FY \d{4}-\d{2} \(AY \d{4}-\d{2}\)$/);
      expect(config.old.slabs.below60.length).toBeGreaterThan(0);
      expect(config.new.slabs.below60.length).toBeGreaterThan(0);
      expect(config.capitalGains.equitySTCGRate).toBeGreaterThan(0);
    }
  });

  it('keeps the old regime slabs and standard deduction unchanged across all years', () => {
    for (const year of years) {
      const config = getConfig(year);
      expect(config.old.standardDeduction).toBe(50000);
      expect(config.old.rebate87A).toEqual({ incomeLimit: 500000, maxAmount: 12500 });
      expect(config.old.slabs.below60).toEqual(assessmentYearConfigs['FY2025-26'].old.slabs.below60);
    }
  });

  it('does not allow the standard deduction under the new regime before FY 2023-24', () => {
    expect(getConfig('FY2021-22').new.standardDeduction).toBe(0);
    expect(getConfig('FY2022-23').new.standardDeduction).toBe(0);
    expect(getConfig('FY2023-24').new.standardDeduction).toBe(50000);
    expect(getConfig('FY2024-25').new.standardDeduction).toBe(75000);
    expect(getConfig('FY2025-26').new.standardDeduction).toBe(75000);
  });

  it('caps the top new regime surcharge rate at 25% from FY 2023-24', () => {
    const topRate = (year: AssessmentYear) =>
      Math.max(...getConfig(year).new.surchargeSlabs.map((slab) => slab.rate));
    expect(topRate('FY2021-22')).toBeCloseTo(0.37);
    expect(topRate('FY2022-23')).toBeCloseTo(0.37);
    expect(topRate('FY2023-24')).toBeCloseTo(0.25);
    expect(topRate('FY2024-25')).toBeCloseTo(0.25);
    expect(topRate('FY2025-26')).toBeCloseTo(0.25);
  });

  it('uses the pre 23 July 2024 capital gains rates for the earlier years', () => {
    for (const year of ['FY2021-22', 'FY2022-23', 'FY2023-24'] as AssessmentYear[]) {
      expect(getConfig(year).capitalGains).toEqual({
        equitySTCGRate: 0.15,
        equityLTCGRate: 0.1,
        equityLTCGExemption: 100000,
        otherLTCGRate: 0.2,
      });
    }
    for (const year of ['FY2024-25', 'FY2025-26'] as AssessmentYear[]) {
      expect(getConfig(year).capitalGains).toEqual({
        equitySTCGRate: 0.2,
        equityLTCGRate: 0.125,
        equityLTCGExemption: 125000,
        otherLTCGRate: 0.125,
      });
    }
  });

  it('throws for an unsupported assessment year', () => {
    expect(() => getConfig('FY2019-20' as AssessmentYear)).toThrow(/Unsupported assessment year/);
  });
});
