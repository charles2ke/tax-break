import { useState } from 'react';
import type { RegimeComparisonResult, TaxCalculationInput } from '@tax-break/tax-engine';
import { useAuth } from '../AuthContext';
import { ApiError, exportExcelUrl, exportPdfUrl, saveTaxReturn } from '../api';

interface Props {
  input: TaxCalculationInput;
  result: RegimeComparisonResult;
  onRequireLogin: () => void;
}

export function SaveExportActions({ input, result, onRequireLogin }: Props) {
  const { user } = useAuth();
  const [savedId, setSavedId] = useState<number | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSave = async () => {
    if (!user) {
      onRequireLogin();
      return;
    }
    setIsSaving(true);
    setError(undefined);
    try {
      const saved = await saveTaxReturn(input.assessmentYear, undefined, input, result);
      setSavedId(saved.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save calculation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Save & Export</h3>
      {!user && (
        <p className="mt-1 text-xs text-slate-500">
          Log in to save this calculation to your account and export it as PDF/Excel.
        </p>
      )}
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || Boolean(savedId)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {savedId ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save this calculation'}
        </button>
        {savedId && (
          <>
            <a
              href={exportPdfUrl(savedId)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Download PDF
            </a>
            <a
              href={exportExcelUrl(savedId)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Download Excel
            </a>
          </>
        )}
      </div>
    </div>
  );
}
