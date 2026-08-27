import { describe, expect, it } from 'vitest';
import {
  US_STATE_TAX_CONFIGS,
  calculateUsStateTax,
  listUsStates,
} from '../src/calculators/usState';
import type { UsState } from '../src/types';

describe('calculateUsStateTax', () => {
  it('returns zero tax for states with no individual income tax', () => {
    for (const state of ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'] as UsState[]) {
      expect(calculateUsStateTax(150000, state).stateTax).toBe(0);
    }
  });

  it('applies a flat rate after the state deduction', () => {
    // Colorado: 4.4% flat on 100,000 - 15,750 = 84,250.
    const result = calculateUsStateTax(100000, 'CO');
    expect(result.stateDeduction).toBe(15750);
    expect(result.stateTaxableIncome).toBe(84250);
    expect(result.stateTax).toBeCloseTo(3707, 2);
  });

  it('applies graduated brackets after the standard deduction and personal exemption', () => {
    // New York: 100,000 - 8,000 = 92,000 taxable.
    const result = calculateUsStateTax(100000, 'NY');
    expect(result.stateTaxableIncome).toBe(92000);
    expect(result.stateTax).toBeCloseTo(4951.75, 2);
  });

  it('never produces a negative taxable income or tax', () => {
    const result = calculateUsStateTax(1000, 'CA');
    expect(result.stateTaxableIncome).toBe(0);
    expect(result.stateTax).toBe(0);
    expect(calculateUsStateTax(-5000, 'CA').stateTax).toBe(0);
  });

  it('lists all 50 states plus DC sorted by name', () => {
    const states = listUsStates();
    expect(states).toHaveLength(51);
    expect(states[0].name).toBe('Alabama');
    expect(states.map((s) => s.name)).toEqual([...states.map((s) => s.name)].sort());
  });

  it('defines non-overlapping, ascending brackets for every state', () => {
    for (const [code, config] of Object.entries(US_STATE_TAX_CONFIGS)) {
      let previousTo = 0;
      for (const bracket of config.brackets) {
        expect(`${code}:${bracket.from}`).toBe(`${code}:${previousTo}`);
        expect(bracket.rate).toBeGreaterThanOrEqual(0);
        previousTo = bracket.to ?? previousTo;
      }
      if (config.brackets.length > 0) {
        expect(config.brackets[config.brackets.length - 1].to).toBeNull();
      }
    }
  });
});
