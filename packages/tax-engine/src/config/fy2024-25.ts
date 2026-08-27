import { AssessmentYearConfig } from '../types';

/**
 * Config for FY 2024-25 (AY 2025-26).
 * Old regime slabs unchanged since FY 2023-24.
 * New regime slabs as per Budget 2023 (applicable for FY 2023-24 and FY 2024-25).
 */
export const fy2024_25: AssessmentYearConfig = {
  assessmentYear: 'FY2024-25',
  label: 'FY 2024-25 (AY 2025-26)',
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
        { from: 0, to: 300000, rate: 0 },
        { from: 300000, to: 600000, rate: 0.05 },
        { from: 600000, to: 900000, rate: 0.1 },
        { from: 900000, to: 1200000, rate: 0.15 },
        { from: 1200000, to: 1500000, rate: 0.2 },
        { from: 1500000, to: null, rate: 0.3 },
      ],
      '60to80': [
        { from: 0, to: 300000, rate: 0 },
        { from: 300000, to: 600000, rate: 0.05 },
        { from: 600000, to: 900000, rate: 0.1 },
        { from: 900000, to: 1200000, rate: 0.15 },
        { from: 1200000, to: 1500000, rate: 0.2 },
        { from: 1500000, to: null, rate: 0.3 },
      ],
      above80: [
        { from: 0, to: 300000, rate: 0 },
        { from: 300000, to: 600000, rate: 0.05 },
        { from: 600000, to: 900000, rate: 0.1 },
        { from: 900000, to: 1200000, rate: 0.15 },
        { from: 1200000, to: 1500000, rate: 0.2 },
        { from: 1500000, to: null, rate: 0.3 },
      ],
    },
    standardDeduction: 50000,
    rebate87A: { incomeLimit: 700000, maxAmount: 25000 },
    surchargeSlabs: [
      { threshold: 5000000, rate: 0.1 },
      { threshold: 10000000, rate: 0.15 },
      { threshold: 20000000, rate: 0.25 },
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
};
