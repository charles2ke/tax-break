import {
  AgeCategory,
  AssessmentYearConfig,
  DeductionsBreakdown,
  DeductionsInput,
  OtherIncomeInput,
  Regime,
} from '../types';

/**
 * Computes the deductions breakdown. Under the New Regime, only the standard deduction is
 * applicable (Chapter VI-A deductions like 80C/80D/80CCD1B/80TTA/80TTB/80E/80G are disallowed).
 */
export function calculateDeductions(
  regime: Regime,
  ageCategory: AgeCategory,
  config: AssessmentYearConfig,
  deductions: DeductionsInput | undefined,
  otherIncome: OtherIncomeInput | undefined,
  standardDeduction: number,
): DeductionsBreakdown {
  if (regime === 'new') {
    return {
      section80C: 0,
      section80D: 0,
      section80CCD1B: 0,
      section80TTA_TTB: 0,
      section80E: 0,
      section80G: 0,
      standardDeduction,
      total: standardDeduction,
    };
  }

  const section80C = Math.min(Math.max(0, deductions?.section80C ?? 0), config.section80C.cap);

  const section80D = calculateSection80D(deductions?.section80D, config);

  const section80CCD1B = Math.min(
    Math.max(0, deductions?.section80CCD1B ?? 0),
    config.section80CCD1B.cap,
  );

  const isSenior = ageCategory === '60to80' || ageCategory === 'above80';
  const savingsInterest = Math.max(0, otherIncome?.savingsInterest ?? 0);
  const otherInterest = Math.max(0, otherIncome?.otherInterest ?? 0);
  const section80TTA_TTB = isSenior
    ? Math.min(savingsInterest + otherInterest, config.section80TTB.cap)
    : Math.min(savingsInterest, config.section80TTA.cap);

  const section80E = Math.max(0, deductions?.section80E ?? 0);
  const section80G = Math.max(0, deductions?.section80G ?? 0);

  const total =
    section80C +
    section80D +
    section80CCD1B +
    section80TTA_TTB +
    section80E +
    section80G +
    standardDeduction;

  return {
    section80C,
    section80D,
    section80CCD1B,
    section80TTA_TTB,
    section80E,
    section80G,
    standardDeduction,
    total,
  };
}

function calculateSection80D(
  input: DeductionsInput['section80D'],
  config: AssessmentYearConfig,
): number {
  if (!input) return 0;

  const selfCap = input.selfSenior
    ? config.section80D.selfAndFamilySeniorCap
    : config.section80D.selfAndFamilyCap;
  const parentsCap = input.parentsSenior
    ? config.section80D.parentsSeniorCap
    : config.section80D.parentsCap;

  const selfAndFamily = Math.min(Math.max(0, input.selfAndFamilyPremium ?? 0), selfCap);
  const parents = Math.min(Math.max(0, input.parentsPremium ?? 0), parentsCap);

  return selfAndFamily + parents;
}
