import { AssessmentYear, AssessmentYearConfig } from '../types';
import { fy2024_25 } from './fy2024-25';
import { fy2025_26 } from './fy2025-26';

export const assessmentYearConfigs: Record<AssessmentYear, AssessmentYearConfig> = {
  'FY2024-25': fy2024_25,
  'FY2025-26': fy2025_26,
};

export function getConfig(assessmentYear: AssessmentYear): AssessmentYearConfig {
  const config = assessmentYearConfigs[assessmentYear];
  if (!config) {
    throw new Error(`Unsupported assessment year: ${String(assessmentYear)}`);
  }
  return config;
}

export function listAssessmentYears(): AssessmentYear[] {
  return Object.keys(assessmentYearConfigs) as AssessmentYear[];
}
