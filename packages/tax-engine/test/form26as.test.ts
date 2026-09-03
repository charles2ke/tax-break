import { describe, expect, it } from 'vitest';
import { parseForm26AS } from '../src/parsers/form26as';

const TRACES_EXPORT = [
  'Form 26AS',
  'Assessment Year^2025-26^Permanent Account Number (PAN)^ABCDE1234F',
  'PART A - Details of Tax Deducted at Source',
  '^Sr. No.^Name of Deductor^TAN of Deductor^Total Amount Paid/Credited^Total Tax Deducted^Total TDS Deposited',
  '1^EXAMPLE TECH PRIVATE LIMITED^DELE12345B^1200000.00^96000.00^96000.00',
  '^Sr. No.^Section^Transaction Date^Status of Booking^Date of Booking^Amount Paid/Credited^Tax Deducted^TDS Deposited',
  '1^192^30-Apr-2024^F^15-May-2024^600000.00^48000.00^48000.00',
  '2^192^31-Oct-2024^F^15-Nov-2024^600000.00^48000.00^48000.00',
  '2^EXAMPLE BANK LIMITED^MUMB54321C^50000.00^5000.00^5000.00',
  '1^194A^30-Jun-2024^F^15-Jul-2024^30000.00^3000.00^3000.00',
  '2^194^31-Aug-2024^F^15-Sep-2024^20000.00^2000.00^2000.00',
  'PART C - Details of Tax Paid (other than TDS or TCS)',
  '1^Advance Tax^0510308^12-Dec-2024^00025^15000.00',
  '2^Self Assessment Tax^0510308^20-Jul-2025^00031^5000.00',
].join('\n');

describe('parseForm26AS', () => {
  it('aggregates salary, interest and dividend income by section', () => {
    const summary = parseForm26AS(TRACES_EXPORT);

    expect(summary.salaryIncome).toBe(1200000);
    expect(summary.interestIncome).toBe(30000);
    expect(summary.dividendIncome).toBe(20000);
    expect(summary.otherIncome).toBe(0);
  });

  it('totals TDS and challan payments as tax already paid', () => {
    const summary = parseForm26AS(TRACES_EXPORT);

    expect(summary.advanceAndSelfAssessmentTax).toBe(20000);
    // 96000 TDS on salary + 3000 + 2000 by the bank + 20000 challans
    expect(summary.totalTaxPaid).toBe(121000);
  });

  it('reports per-section totals', () => {
    const summary = parseForm26AS(TRACES_EXPORT);

    expect(summary.sections).toEqual([
      { section: '192', amountPaid: 1200000, taxDeducted: 96000 },
      { section: '194A', amountPaid: 30000, taxDeducted: 3000 },
      { section: '194', amountPaid: 20000, taxDeducted: 2000 },
    ]);
  });

  it('supports comma separated exports with thousands separators', () => {
    const summary = parseForm26AS(
      [
        'Sr. No.,Section,Transaction Date,Amount Paid/Credited,Tax Deducted',
        '1,194J,10-Jan-2025,"2,50,000.00","25,000.00"',
      ].join('\n'),
    );

    expect(summary.otherIncome).toBe(250000);
    expect(summary.totalTaxPaid).toBe(25000);
  });

  it('excludes property sale consideration from income but keeps its TDS', () => {
    const summary = parseForm26AS('1^194IA^05-Mar-2025^F^15-Mar-2025^5000000.00^50000.00^50000.00');

    expect(summary.otherIncome).toBe(0);
    expect(summary.totalTaxPaid).toBe(50000);
  });

  it('returns zeroes for content with no recognisable rows', () => {
    const summary = parseForm26AS('This file contains no tax data at all.');

    expect(summary.totalTaxPaid).toBe(0);
    expect(summary.sections).toEqual([]);
  });
});
