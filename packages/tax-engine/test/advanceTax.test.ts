import { describe, expect, it } from 'vitest';
import { calculateAdvanceTax } from '../src/calculators/advanceTax';

describe('calculateAdvanceTax', () => {
  it('does not require advance tax when net payable is below the ₹10,000 threshold', () => {
    const result = calculateAdvanceTax(50000, 45000, 'FY2025-26');
    expect(result.advanceTaxApplicable).toBe(false);
    expect(result.totalInterest).toBe(0);
    expect(result.installments.every((i) => i.amountDueThisInstallment === 0)).toBe(true);
  });

  it('computes the cumulative 15/45/75/100 percent installment schedule', () => {
    const result = calculateAdvanceTax(100000, 0, 'FY2025-26');
    expect(result.advanceTaxApplicable).toBe(true);
    expect(result.installments).toHaveLength(4);
    expect(result.installments[0].cumulativeAmountDue).toBe(15000);
    expect(result.installments[1].cumulativeAmountDue).toBe(45000);
    expect(result.installments[2].cumulativeAmountDue).toBe(75000);
    expect(result.installments[3].cumulativeAmountDue).toBe(100000);
  });

  it('sets correct due dates spanning the assessment year', () => {
    const result = calculateAdvanceTax(100000, 0, 'FY2024-25');
    expect(result.installments[0].dueDate).toBe('2024-06-15');
    expect(result.installments[1].dueDate).toBe('2024-09-15');
    expect(result.installments[2].dueDate).toBe('2024-12-15');
    expect(result.installments[3].dueDate).toBe('2025-03-15');
  });

  it('does not charge interest when tax already paid covers at least 90% of the liability', () => {
    const result = calculateAdvanceTax(100000, 95000, 'FY2025-26');
    expect(result.interestSection234B).toBe(0);
  });

  it('charges 234B interest when tax paid is below 90% of total liability', () => {
    const result = calculateAdvanceTax(100000, 50000, 'FY2025-26');
    expect(result.interestSection234B).toBeGreaterThan(0);
  });

  it('reduces cumulative amounts due proportionally when some tax is already paid', () => {
    const result = calculateAdvanceTax(100000, 40000, 'FY2025-26');
    expect(result.netTaxPayable).toBe(60000);
    expect(result.installments[3].cumulativeAmountDue).toBe(60000);
  });
});
