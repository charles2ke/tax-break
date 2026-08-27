import { describe, expect, it } from 'vitest';
import { calculateDeductions } from '../src/calculators/deductions';
import { getConfig } from '../src/config';

describe('calculateDeductions', () => {
  const config = getConfig('FY2024-25');

  it('only applies the standard deduction under the new regime', () => {
    const result = calculateDeductions(
      'new',
      'below60',
      config,
      { section80C: 150000, section80D: { selfAndFamilyPremium: 25000 } },
      { savingsInterest: 10000 },
      75000,
    );
    expect(result.section80C).toBe(0);
    expect(result.section80D).toBe(0);
    expect(result.section80TTA_TTB).toBe(0);
    expect(result.standardDeduction).toBe(75000);
    expect(result.total).toBe(75000);
  });

  it('caps section 80C at 1,50,000 under the old regime', () => {
    const result = calculateDeductions('old', 'below60', config, { section80C: 200000 }, {}, 50000);
    expect(result.section80C).toBe(150000);
  });

  it('applies correct 80D caps for self/family and senior citizen parents', () => {
    const result = calculateDeductions(
      'old',
      'below60',
      config,
      {
        section80D: {
          selfAndFamilyPremium: 30000,
          parentsPremium: 60000,
          selfSenior: false,
          parentsSenior: true,
        },
      },
      {},
      50000,
    );
    // self/family capped at 25000 (not senior), parents capped at 50000 (senior)
    expect(result.section80D).toBe(75000);
  });

  it('caps section 80CCD(1B) NPS deduction at 50,000', () => {
    const result = calculateDeductions('old', 'below60', config, { section80CCD1B: 80000 }, {}, 50000);
    expect(result.section80CCD1B).toBe(50000);
  });

  it('applies 80TTA cap of 10,000 on savings interest for below-60 taxpayers', () => {
    const result = calculateDeductions('old', 'below60', config, {}, { savingsInterest: 15000 }, 50000);
    expect(result.section80TTA_TTB).toBe(10000);
  });

  it('applies 80TTB cap of 50,000 on all interest income for senior citizens', () => {
    const result = calculateDeductions(
      'old',
      '60to80',
      config,
      {},
      { savingsInterest: 10000, otherInterest: 45000 },
      50000,
    );
    expect(result.section80TTA_TTB).toBe(50000);
  });

  it('allows section 80E (education loan interest) without any cap', () => {
    const result = calculateDeductions('old', 'below60', config, { section80E: 400000 }, {}, 50000);
    expect(result.section80E).toBe(400000);
  });

  it('sums up all deductions plus standard deduction correctly', () => {
    const result = calculateDeductions(
      'old',
      'below60',
      config,
      { section80C: 150000, section80CCD1B: 50000, section80E: 40000, section80G: 20000 },
      { savingsInterest: 10000 },
      50000,
    );
    expect(result.total).toBe(150000 + 50000 + 10000 + 40000 + 20000 + 50000);
  });

  it('handles no deductions and no other income gracefully', () => {
    const result = calculateDeductions('old', 'below60', config, undefined, undefined, 50000);
    expect(result.total).toBe(50000);
  });
});
