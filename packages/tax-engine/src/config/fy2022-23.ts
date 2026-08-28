import { AssessmentYearConfig } from '../types';

/**
 * Config for FY 2022-23 (AY 2023-24).
 * Identical to FY 2021-22: no slab or rebate changes were made for this year.
 */
export const fy2022_23: AssessmentYearConfig = {
  assessmentYear: 'FY2022-23',
  label: 'FY 2022-23 (AY 2023-24)',
  old: {
    slabs: {
      below60: [
        { from: 0, to: 250000, rate: 0 },
        { from: 250000, to: 500000, rate: 0.05 },
        { from: 500000, to: 1000000, rate: 0.2 },
        { from: 1000000, to: null, rate: 0.3 },
      ],
      '60to80': [
        { from: 0, to: 300000, rate: 0 },
        { from: 300000, to: 500000, rate: 0.05 },
        { from: 500000, to: 1000000, rate: 0.2 },
        { from: 1000000, to: null, rate: 0.3 },
      ],
      above80: [
        { from: 0, to: 500000, rate: 0 },
        { from: 500000, to: 1000000, rate: 0.2 },
        { from: 1000000, to: null, rate: 0.3 },
      ],
    },
    standardDeduction: 50000,
    rebate87A: { incomeLimit: 500000, maxAmount: 12500 },
    surchargeSlabs: [
      { threshold: 5000000, rate: 0.1 },
      { threshold: 10000000, rate: 0.15 },
      { threshold: 20000000, rate: 0.25 },
      { threshold: 50000000, rate: 0.37 },
    ],
    cessRate: 0.04,
  },
  new: {
    slabs: {
      below60: [
        { from: 0, to: 250000, rate: 0 },
        { from: 250000, to: 500000, rate: 0.05 },
        { from: 500000, to: 750000, rate: 0.1 },
        { from: 750000, to: 1000000, rate: 0.15 },
        { from: 1000000, to: 1250000, rate: 0.2 },
        { from: 1250000, to: 1500000, rate: 0.25 },
        { from: 1500000, to: null, rate: 0.3 },
      ],
      '60to80': [
        { from: 0, to: 250000, rate: 0 },
        { from: 250000, to: 500000, rate: 0.05 },
        { from: 500000, to: 750000, rate: 0.1 },
        { from: 750000, to: 1000000, rate: 0.15 },
        { from: 1000000, to: 1250000, rate: 0.2 },
        { from: 1250000, to: 1500000, rate: 0.25 },
        { from: 1500000, to: null, rate: 0.3 },
      ],
      above80: [
        { from: 0, to: 250000, rate: 0 },
        { from: 250000, to: 500000, rate: 0.05 },
        { from: 500000, to: 750000, rate: 0.1 },
        { from: 750000, to: 1000000, rate: 0.15 },
        { from: 1000000, to: 1250000, rate: 0.2 },
        { from: 1250000, to: 1500000, rate: 0.25 },
        { from: 1500000, to: null, rate: 0.3 },
      ],
    },
    standardDeduction: 0,
    rebate87A: { incomeLimit: 500000, maxAmount: 12500 },
    surchargeSlabs: [
      { threshold: 5000000, rate: 0.1 },
      { threshold: 10000000, rate: 0.15 },
      { threshold: 20000000, rate: 0.25 },
      { threshold: 50000000, rate: 0.37 },
    ],
    cessRate: 0.04,
  },
  section80C: { cap: 150000 },
  section80CCD1B: { cap: 50000 },
  section80D: {
    selfAndFamilyCap: 25000,
    selfAndFamilySeniorCap: 50000,
    parentsCap: 25000,
    parentsSeniorCap: 50000,
  },
  section80TTA: { cap: 10000 },
  section80TTB: { cap: 50000 },
  homeLoanInterestCap: { selfOccupied: 200000 },
  capitalGains: {
    equitySTCGRate: 0.15,
    equityLTCGRate: 0.1,
    equityLTCGExemption: 100000,
    otherLTCGRate: 0.2,
  },
};
