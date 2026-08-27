import type { AgeCategory, AssessmentYear } from '@tax-break/tax-engine';
import { assessmentYearConfigs, listAssessmentYears } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

// Derived from the tax engine so the form always offers every supported financial year
// (the current year and the previous four).
const ASSESSMENT_YEARS: { value: AssessmentYear; label: string }[] = listAssessmentYears()
  .map((value) => ({ value, label: assessmentYearConfigs[value].label }))
  .reverse();

const AGE_CATEGORIES: { value: AgeCategory; label: string }[] = [
  { value: 'below60', label: 'Below 60 years' },
  { value: '60to80', label: '60 to 80 years (Senior Citizen)' },
  { value: 'above80', label: '80+ years (Super Senior Citizen)' },
];

export function BasicInfoSection({ form, onChange }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">1. Basic Info</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Assessment Year</span>
          <select
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            value={form.assessmentYear}
            onChange={(e) =>
              onChange((f) => ({ ...f, assessmentYear: e.target.value as AssessmentYear }))
            }
          >
            {ASSESSMENT_YEARS.map((ay) => (
              <option key={ay.value} value={ay.value}>
                {ay.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Pick the financial year the income was earned in (its assessment year is shown in
            brackets). Slab rates, deduction limits and capital gains rates for that year are
            applied. Returns for the last five years are available.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Age Category</span>
          <select
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            value={form.ageCategory}
            onChange={(e) => onChange((f) => ({ ...f, ageCategory: e.target.value as AgeCategory }))}
          >
            {AGE_CATEGORIES.map((ac) => (
              <option key={ac.value} value={ac.value}>
                {ac.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Your age at any time during the selected financial year. Senior citizens get a higher
            basic exemption limit under the Old Regime and the 80TTB interest deduction.
          </span>
        </label>
      </div>
    </section>
  );
}
