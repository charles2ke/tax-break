import { describe, expect, it } from 'vitest';
import {
  CapitalGainsStatementError,
  parseCapitalGainsStatement,
} from '../src/parsers/capitalGainsStatement';

const ZERODHA_TRADEWISE = [
  'Tradewise Exits from 2024-04-01 to 2025-03-31',
  'Symbol,ISIN,Entry Date,Exit Date,Quantity,Buy Value,Sell Value,Realized P&L,Period of Holding',
  'INFY,INE009A01021,10-05-2023,20-08-2024,100,"1,40,000.00","1,80,000.00","40,000.00",Long Term',
  'TCS,INE467B01029,01-06-2024,15-12-2024,50,"1,90,000.00","2,05,000.00","15,000.00",Short Term',
  'Total,,,,,,,"55,000.00",',
].join('\n');

const US_1099B = [
  'Consolidated Form 1099-B',
  'Description,Date acquired,Date sold,Proceeds,Cost or other basis,Term',
  'AAPL 20 sh,03/12/2021,06/20/2024,"5,400.00","3,200.00",Long term',
  'NVDA 5 sh,01/05/2024,11/18/2024,"2,100.00","2,600.00",Short term',
].join('\n');

describe('parseCapitalGainsStatement', () => {
  it('buckets an Indian tradewise statement into equity STCG and LTCG', () => {
    const summary = parseCapitalGainsStatement(ZERODHA_TRADEWISE);

    expect(summary.format).toBe('india-broker');
    expect(summary.currency).toBe('INR');
    expect(summary.trades).toHaveLength(2);
    expect(summary.india).toEqual({
      equitySTCG: 15000,
      equityLTCG: 40000,
      otherSTCG: 0,
      otherLTCG: 0,
    });
    expect(summary.warnings).toEqual([]);
  });

  it('reads dates day-first for Indian statements', () => {
    const [longTerm] = parseCapitalGainsStatement(ZERODHA_TRADEWISE).trades;

    expect(longTerm.buyDate).toBe('2023-05-10');
    expect(longTerm.sellDate).toBe('2024-08-20');
    expect(longTerm.term).toBe('long');
  });

  it('buckets a US Form 1099-B into short and long term gains', () => {
    const summary = parseCapitalGainsStatement(US_1099B);

    expect(summary.format).toBe('us-1099b');
    expect(summary.currency).toBe('USD');
    expect(summary.us).toEqual({ shortTermGains: -500, longTermGains: 2200 });
  });

  it('reads dates month-first for US statements', () => {
    const [longTerm] = parseCapitalGainsStatement(US_1099B).trades;

    expect(longTerm.buyDate).toBe('2021-03-12');
    expect(longTerm.sellDate).toBe('2024-06-20');
  });

  it('derives the term from the holding period when no term column is present', () => {
    const summary = parseCapitalGainsStatement(
      [
        'Scrip,Buy Date,Sell Date,Buy Value,Sell Value',
        'HDFCBANK,01-02-2023,01-09-2024,100000,130000',
        'RELIANCE,01-02-2024,01-09-2024,100000,90000',
      ].join('\n'),
    );

    expect(summary.india.equityLTCG).toBe(30000);
    expect(summary.india.equitySTCG).toBe(-10000);
  });

  it('treats debt funds and property as non-equity assets', () => {
    const summary = parseCapitalGainsStatement(
      [
        'Symbol,Asset Type,Buy Date,Sell Date,Buy Value,Sell Value',
        'ICICI LIQUID FUND,Debt Mutual Fund,01-05-2021,01-07-2024,200000,230000',
        'SBI SHORT DEBT,Debt Mutual Fund,01-05-2024,01-07-2024,100000,104000',
      ].join('\n'),
    );

    expect(summary.india.otherLTCG).toBe(30000);
    expect(summary.india.otherSTCG).toBe(4000);
    expect(summary.india.equityLTCG).toBe(0);
  });

  it('warns when a row has no holding period and defaults it to short term', () => {
    const summary = parseCapitalGainsStatement(
      ['Symbol,Buy Value,Sell Value', 'ITC,50000,62000'].join('\n'),
    );

    expect(summary.india.equitySTCG).toBe(12000);
    expect(summary.warnings[0]).toContain('short-term');
  });

  it('rejects a file with no recognisable capital gains columns', () => {
    expect(() => parseCapitalGainsStatement('hello,world\n1,2')).toThrow(
      CapitalGainsStatementError,
    );
  });
});
