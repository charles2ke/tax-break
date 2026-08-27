import { describe, expect, it } from 'vitest';
import { calculateHraExemption } from '../src/calculators/hra';

describe('calculateHraExemption', () => {
  it('takes least of the three limits for a metro city', () => {
    const result = calculateHraExemption(300000, 150000, 180000, 'metro');
    // 10% of basic = 30000; rent - 10% basic = 150000; metro limit (50%) = 150000; actual HRA = 150000
    expect(result.exemptAmount).toBeCloseTo(150000);
    expect(result.taxableHra).toBeCloseTo(0);
  });

  it('takes least of the three limits for a non-metro city', () => {
    const result = calculateHraExemption(600000, 240000, 180000, 'non-metro');
    // 10% of basic = 60000; rent - 10% basic = 120000; non-metro limit (40%) = 240000; actual HRA = 240000
    // least = 120000
    expect(result.exemptAmount).toBeCloseTo(120000);
    expect(result.taxableHra).toBeCloseTo(120000);
  });

  it('returns zero exemption when no rent is paid', () => {
    const result = calculateHraExemption(500000, 100000, 0, 'metro');
    expect(result.exemptAmount).toBe(0);
    expect(result.taxableHra).toBe(100000);
  });

  it('caps exemption at actual HRA received even if other limits are higher', () => {
    const result = calculateHraExemption(1000000, 50000, 600000, 'metro');
    // actual HRA received (50000) is the smallest of the three limits
    expect(result.exemptAmount).toBeCloseTo(50000);
    expect(result.taxableHra).toBeCloseTo(0);
  });

  it('handles zero basic and zero HRA gracefully', () => {
    const result = calculateHraExemption(0, 0, 0, 'metro');
    expect(result.exemptAmount).toBe(0);
    expect(result.taxableHra).toBe(0);
  });
});
