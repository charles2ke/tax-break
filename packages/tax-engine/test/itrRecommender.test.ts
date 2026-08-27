import { describe, expect, it } from 'vitest';
import { recommendItrForm } from '../src/calculators/itrRecommender';

describe('recommendItrForm', () => {
  it('recommends ITR-1 for simple salary + single house property + other income', () => {
    const result = recommendItrForm({
      hasSalaryIncome: true,
      hasSingleHouseProperty: true,
      totalIncome: 1200000,
    });
    expect(result.recommendedForm).toBe('ITR-1');
  });

  it('recommends ITR-2 when capital gains are present', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, hasCapitalGains: true });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('recommends ITR-2 for multiple house properties', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, hasMultipleHouseProperties: true });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('recommends ITR-2 when total income exceeds ₹50,00,000', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, totalIncome: 6000000 });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('recommends ITR-2 for non-residents', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, isResidentIndividual: false });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('recommends ITR-2 when foreign assets/income are present', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, hasForeignAssetsOrIncome: true });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('recommends ITR-3 for business/profession income without presumptive taxation', () => {
    const result = recommendItrForm({ hasBusinessOrProfessionIncome: true });
    expect(result.recommendedForm).toBe('ITR-3');
  });

  it('recommends ITR-4 for presumptive taxation scheme business income', () => {
    const result = recommendItrForm({
      hasBusinessOrProfessionIncome: true,
      isPresumptiveTaxationScheme: true,
    });
    expect(result.recommendedForm).toBe('ITR-4');
  });

  it('recommends ITR-3 for presumptive business income combined with capital gains', () => {
    const result = recommendItrForm({
      hasBusinessOrProfessionIncome: true,
      isPresumptiveTaxationScheme: true,
      hasCapitalGains: true,
    });
    expect(result.recommendedForm).toBe('ITR-3');
  });

  it('recommends ITR-2 for company directors', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, isCompanyDirector: true });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('recommends ITR-2 for holders of unlisted equity shares', () => {
    const result = recommendItrForm({ hasSalaryIncome: true, hasUnlistedEquityShares: true });
    expect(result.recommendedForm).toBe('ITR-2');
  });

  it('always includes at least one reason', () => {
    const result = recommendItrForm({ hasSalaryIncome: true });
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
