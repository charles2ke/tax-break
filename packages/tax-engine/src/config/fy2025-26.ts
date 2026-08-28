import { AssessmentYearConfig } from '../types';

/**
 * Config for FY 2025-26 (AY 2026-27).
 * Old regime slabs unchanged.
 * New regime revised as per Budget 2025 with wider slabs and a higher rebate threshold.
 */
export const fy2025_26: AssessmentYearConfig = {
  assessmentYear: 'FY2025-26',
  label: 'FY 2025-26 (AY 2026-27)',
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
        { from: 0, to: 400000, rate: 0 },
        { from: 400000, to: 800000, rate: 0.05 },
        { from: 800000, to: 1200000, rate: 0.1 },
        { from: 1200000, to: 1600000, rate: 0.15 },
        { from: 1600000, to: 2000000, rate: 0.2 },
        { from: 2000000, to: 2400000, rate: 0.25 },
        { from: 2400000, to: null, rate: 0.3 },
      ],
      '60to80': [
        { from: 0, to: 400000, rate: 0 },
        { from: 400000, to: 800000, rate: 0.05 },
        { from: 800000, to: 1200000, rate: 0.1 },
        { from: 1200000, to: 1600000, rate: 0.15 },
        { from: 1600000, to: 2000000, rate: 0.2 },
        { from: 2000000, to: 2400000, rate: 0.25 },
        { from: 2400000, to: null, rate: 0.3 },
      ],
      above80: [
        { from: 0, to: 400000, rate: 0 },
        { from: 400000, to: 800000, rate: 0.05 },
        { from: 800000, to: 1200000, rate: 0.1 },
        { from: 1200000, to: 1600000, rate: 0.15 },
        { from: 1600000, to: 2000000, rate: 0.2 },
        { from: 2000000, to: 2400000, rate: 0.25 },
        { from: 2400000, to: null, rate: 0.3 },
      ],
    },
    standardDeduction: 75000,
    rebate87A: { incomeLimit: 1200000, maxAmount: 60000, marginalRelief: true },
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
  capitalGains: {
    equitySTCGRate: 0.2,
    equityLTCGRate: 0.125,
    equityLTCGExemption: 125000,
    otherLTCGRate: 0.125,
  },
};
