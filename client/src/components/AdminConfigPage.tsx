import { useEffect, useState } from 'react';
import type { AssessmentYear } from '@tax-break/tax-engine';
import { listAssessmentYears } from '@tax-break/tax-engine';
import { ApiError, getAdminConfig, resetAdminConfig, updateAdminConfig } from '../api';

interface Props {
  onBack: () => void;
}

const ASSESSMENT_YEARS: AssessmentYear[] = [...listAssessmentYears()].reverse();

export function AdminConfigPage({ onBack }: Props) {
  const [assessmentYear, setAssessmentYear] = useState<AssessmentYear>('FY2025-26');
  const [configText, setConfigText] = useState('');
  const [hasOverride, setHasOverride] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const load = (year: AssessmentYear) => {
    setIsLoading(true);
    setError(undefined);
    getAdminConfig(year)
      .then((res) => {
        setConfigText(JSON.stringify(res.config, null, 2));
        setHasOverride(Boolean(res.hasOverride));
        setUpdatedAt(res.updatedAt ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load config'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => load(assessmentYear), [assessmentYear]);

  const handleSave = async () => {
    setError(undefined);
    setMessage(undefined);
    let parsed: unknown;
    try {
      parsed = JSON.parse(configText);
    } catch {
      setError('Config must be valid JSON');
      return;
    }
    try {
      const res = await updateAdminConfig(assessmentYear, parsed);
      setConfigText(JSON.stringify(res.config, null, 2));
      setMessage('Configuration saved. It will apply to all future calculations immediately.');
      load(assessmentYear);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save config');
    }
  };

  const handleReset = async () => {
    setError(undefined);
    setMessage(undefined);
    try {
      const res = await resetAdminConfig(assessmentYear);
      setConfigText(JSON.stringify(res.config, null, 2));
      setMessage('Reset to the built-in default configuration.');
      load(assessmentYear);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset config');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button type="button" onClick={onBack} className="mb-6 text-sm font-medium text-indigo-600 hover:underline">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-slate-900">Admin: Tax Config Panel</h1>
      <p className="mt-2 text-sm text-slate-600">
        Edit the slab rates, deduction caps, surcharge, and cess configuration used for
        calculations. Changes apply immediately to every user.
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-medium text-slate-700">Assessment Year</span>
        <select
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          value={assessmentYear}
          onChange={(e) => setAssessmentYear(e.target.value as AssessmentYear)}
        >
          {ASSESSMENT_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <p className="mt-3 text-xs text-slate-500">
        {hasOverride
          ? `Custom override active${updatedAt ? ` (last updated ${new Date(updatedAt).toLocaleString('en-IN')})` : ''}.`
          : 'Using the built-in default configuration.'}
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <textarea
            className="mt-4 h-[28rem] w-full rounded-md border border-slate-300 p-3 font-mono text-xs shadow-sm"
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            spellCheck={false}
          />
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          {message && <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset to Default
            </button>
          </div>
        </>
      )}
    </div>
  );
}
