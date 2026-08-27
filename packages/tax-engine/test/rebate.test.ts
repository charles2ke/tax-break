import { describe, expect, it } from 'vitest';
import { calculateRebate87A } from '../src/calculators/rebate';
import { getConfig } from '../src/config';

describe('calculateRebate87A', () => {
  it('grants full rebate under old regime exactly at the 5,00,000 threshold', () => {
    const config = getConfig('FY2024-25');
    const rebate = calculateRebate87A(500000, 12500, config.old.rebate87A);
    expect(rebate).toBe(12500);
  });

  it('denies rebate under old regime just above the 5,00,000 threshold', () => {
    const config = getConfig('FY2024-25');
    const rebate = calculateRebate87A(500001, 12500.3, config.old.rebate87A);
    expect(rebate).toBe(0);
  });

  it('grants full rebate under new regime (FY2024-25) exactly at the 7,00,000 threshold', () => {
    const config = getConfig('FY2024-25');
    const rebate = calculateRebate87A(700000, 25000, config.new.rebate87A);
    expect(rebate).toBe(25000);
  });

  it('denies rebate under new regime (FY2024-25) just above the 7,00,000 threshold', () => {
    const config = getConfig('FY2024-25');
    const rebate = calculateRebate87A(700001, 25000.1, config.new.rebate87A);
    expect(rebate).toBe(0);
  });

  it('grants full rebate under new regime (FY2025-26) up to 12,00,000 with max amount 60,000', () => {
    const config = getConfig('FY2025-26');
    const rebate = calculateRebate87A(1200000, 60000, config.new.rebate87A);
    expect(rebate).toBe(60000);
  });

  it('caps the rebate at the maximum configured amount even if tax before rebate is higher', () => {
    const config = getConfig('FY2024-25');
    const rebate = calculateRebate87A(500000, 50000, config.old.rebate87A);
    expect(rebate).toBe(12500);
  });
});
