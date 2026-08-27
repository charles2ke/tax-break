import { describe, expect, it } from 'vitest';
import { CAPITAL_GAINS_RATES, calculateCapitalGains } from '../src/calculators/capitalGains';

describe('calculateCapitalGains', () => {
  it('returns all zeros when no capital gains are provided', () => {
    const result = calculateCapitalGains();
    expect(result.totalCapitalGainsTax).toBe(0);
    expect(result.totalCapitalGainsIncome).toBe(0);
  });

  it('taxes equity STCG at 20% under Section 111A', () => {
    const result = calculateCapitalGains({ equitySTCG: 100000 });
    expect(result.equitySTCGTax).toBeCloseTo(100000 * CAPITAL_GAINS_RATES.equitySTCGRate);
  });

  it('exempts the first ₹1,25,000 of equity LTCG under Section 112A', () => {
    const result = calculateCapitalGains({ equityLTCG: 125000 });
    expect(result.equityLTCGTax).toBe(0);
    expect(result.equityLTCGExemptionUsed).toBe(125000);
  });

  it('taxes equity LTCG above the exemption at 12.5% under Section 112A', () => {
    const result = calculateCapitalGains({ equityLTCG: 225000 });
    expect(result.equityLTCGExemptionUsed).toBe(125000);
    expect(result.equityLTCGTax).toBeCloseTo(100000 * CAPITAL_GAINS_RATES.equityLTCGRate);
  });

  it('taxes other LTCG at 12.5% under Section 112', () => {
    const result = calculateCapitalGains({ otherLTCG: 200000 });
    expect(result.otherLTCGTax).toBeCloseTo(200000 * CAPITAL_GAINS_RATES.otherLTCGRate);
  });

  it('treats other STCG as addable to normal taxable income rather than taxing it directly', () => {
    const result = calculateCapitalGains({ otherSTCG: 50000 });
    expect(result.otherSTCGAddedToIncome).toBe(50000);
    expect(result.totalCapitalGainsTax).toBe(0);
  });

  it('sums all components into the total capital gains tax and income', () => {
    const result = calculateCapitalGains({
      equitySTCG: 100000,
      equityLTCG: 225000,
      otherSTCG: 50000,
      otherLTCG: 200000,
    });
    expect(result.totalCapitalGainsIncome).toBe(100000 + 225000 + 50000 + 200000);
    expect(result.totalCapitalGainsTax).toBeCloseTo(
      result.equitySTCGTax + result.equityLTCGTax + result.otherLTCGTax,
    );
  });

  it('ignores negative inputs', () => {
    const result = calculateCapitalGains({
      equitySTCG: -100,
      equityLTCG: -100,
      otherSTCG: -100,
      otherLTCG: -100,
    });
    expect(result.totalCapitalGainsIncome).toBe(0);
    expect(result.totalCapitalGainsTax).toBe(0);
  });

  it('uses the supplied assessment year rates when provided', () => {
    const preJuly2024Rates = {
      equitySTCGRate: 0.15,
      equityLTCGRate: 0.1,
      equityLTCGExemption: 100000,
      otherLTCGRate: 0.2,
    };
    const result = calculateCapitalGains(
      { equitySTCG: 100000, equityLTCG: 200000, otherLTCG: 100000 },
      preJuly2024Rates,
    );
    expect(result.equitySTCGTax).toBeCloseTo(15000);
    expect(result.equityLTCGExemptionUsed).toBe(100000);
    expect(result.equityLTCGTax).toBeCloseTo(10000);
    expect(result.otherLTCGTax).toBeCloseTo(20000);
  });
});
