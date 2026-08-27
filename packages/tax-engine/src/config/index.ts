import { AssessmentYear, AssessmentYearConfig } from '../types';
import { fy2021_22 } from './fy2021-22';
import { fy2022_23 } from './fy2022-23';
import { fy2023_24 } from './fy2023-24';
import { fy2024_25 } from './fy2024-25';
import { fy2025_26 } from './fy2025-26';

export const assessmentYearConfigs: Record<AssessmentYear, AssessmentYearConfig> = {
  'FY2021-22': fy2021_22,
  'FY2022-23': fy2022_23,
  'FY2023-24': fy2023_24,
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
