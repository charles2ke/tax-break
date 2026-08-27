import { AssessmentYear, AssessmentYearConfig, getConfig, listAssessmentYears } from '@tax-break/tax-engine';
import { getDb } from './index';

export interface ConfigOverrideRecord {
  assessment_year: string;
  config_json: string;
  updated_by: number | null;
  updated_at: string;
}

export function getEffectiveConfig(assessmentYear: AssessmentYear): AssessmentYearConfig {
  const override = getConfigOverride(assessmentYear);
  if (override) {
    return JSON.parse(override.config_json) as AssessmentYearConfig;
  }
  return getConfig(assessmentYear);
}

export function getConfigOverride(assessmentYear: string): ConfigOverrideRecord | undefined {
  return getDb()
    .prepare('SELECT * FROM config_overrides WHERE assessment_year = ?')
    .get(assessmentYear) as ConfigOverrideRecord | undefined;
}

export function saveConfigOverride(
  assessmentYear: AssessmentYear,
  config: AssessmentYearConfig,
  updatedBy: number,
): void {
  getDb()
    .prepare(
      `INSERT INTO config_overrides (assessment_year, config_json, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(assessment_year) DO UPDATE SET
         config_json = excluded.config_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`,
    )
    .run(assessmentYear, JSON.stringify(config), updatedBy);
}

export function resetConfigOverride(assessmentYear: string): boolean {
  const result = getDb()
    .prepare('DELETE FROM config_overrides WHERE assessment_year = ?')
    .run(assessmentYear);
  return result.changes > 0;
}

export function isKnownAssessmentYear(value: string): value is AssessmentYear {
  return (listAssessmentYears() as string[]).includes(value);
}
