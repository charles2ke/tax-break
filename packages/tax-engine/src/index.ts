export * from './types';
export { getConfig, listAssessmentYears, assessmentYearConfigs } from './config';
export { calculateHraExemption } from './calculators/hra';
export { calculateHouseProperty } from './calculators/houseProperty';
export { calculateDeductions } from './calculators/deductions';
export { calculateSlabTax } from './calculators/slabTax';
export { calculateRebate87A } from './calculators/rebate';
export { calculateSurcharge } from './calculators/surcharge';
export { calculateTaxForRegime } from './calculators/regime';
export { compareRegimes } from './calculators/compare';
export { calculateInternationalTax } from './calculators/international';
export {
  calculateUsStateTax,
  listUsStates,
  US_STATE_TAX_CONFIGS,
} from './calculators/usState';
export type { UsStateTaxConfig, UsStateTaxResult } from './calculators/usState';
export { calculateCapitalGains, CAPITAL_GAINS_RATES } from './calculators/capitalGains';
export { calculateAdvanceTax } from './calculators/advanceTax';
export { recommendItrForm } from './calculators/itrRecommender';
