import { ItrForm, ItrRecommendation, ItrRecommenderInput } from '../types';

const ITR1_INCOME_LIMIT = 5000000;

/**
 * Recommends the applicable Income Tax Return (ITR) form for a resident individual based on a
 * simplified set of eligibility rules. This is indicative only - always confirm the correct
 * form using the official e-filing utility or a tax professional.
 */
export function recommendItrForm(input: ItrRecommenderInput): ItrRecommendation {
  const reasons: string[] = [];

  const isResident = input.isResidentIndividual ?? true;
  const totalIncome = input.totalIncome ?? 0;

  if (input.hasBusinessOrProfessionIncome && !input.isPresumptiveTaxationScheme) {
    reasons.push('Business/profession income without presumptive taxation requires ITR-3.');
    return { recommendedForm: 'ITR-3', reasons };
  }

  if (input.hasBusinessOrProfessionIncome && input.isPresumptiveTaxationScheme) {
    reasons.push(
      'Business/profession income under the presumptive taxation scheme (Sections 44AD/44ADA/44AE) is reported in ITR-4.',
    );
    if (input.hasCapitalGains) {
      reasons.push(
        'ITR-4 does not support capital gains reporting; ITR-3 is required if capital gains are present alongside presumptive income.',
      );
      return { recommendedForm: 'ITR-3', reasons };
    }
    return { recommendedForm: 'ITR-4', reasons };
  }

  if (
    !isResident ||
    input.hasForeignAssetsOrIncome ||
    input.isCompanyDirector ||
    input.hasUnlistedEquityShares
  ) {
    reasons.push(
      'Non-residents, company directors, holders of unlisted equity shares, or those with foreign assets/income must file ITR-2.',
    );
    return { recommendedForm: 'ITR-2', reasons };
  }

  if (input.hasCapitalGains) {
    reasons.push('Capital gains income requires ITR-2 (or ITR-3 if business income is present).');
    return { recommendedForm: 'ITR-2', reasons };
  }

  if (input.hasMultipleHouseProperties) {
    reasons.push('Income from more than one house property requires ITR-2.');
    return { recommendedForm: 'ITR-2', reasons };
  }

  if (totalIncome > ITR1_INCOME_LIMIT) {
    reasons.push('Total income above ₹50,00,000 requires ITR-2.');
    return { recommendedForm: 'ITR-2', reasons };
  }

  const form: ItrForm = 'ITR-1';
  reasons.push(
    'Income limited to salary/pension, one house property, and other sources (interest, dividends) under ₹50,00,000 qualifies for ITR-1 (Sahaj).',
  );
  return { recommendedForm: form, reasons };
}
