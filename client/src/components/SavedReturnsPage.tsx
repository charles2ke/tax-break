import { useEffect, useState } from 'react';
import {
  ApiError,
  deleteSavedTaxReturn,
  efileTaxReturn,
  exportExcelUrl,
  exportPdfUrl,
  listSavedTaxReturns,
} from '../api';
import type { SavedTaxReturn } from '../api';

interface Props {
  onBack: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SavedReturnsPage({ onBack }: Props) {
  const [returns, setReturns] = useState<SavedTaxReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [efilingMessage, setEfilingMessage] = useState<string | undefined>();

  const load = () => {
    setIsLoading(true);
    listSavedTaxReturns()
      .then(setReturns)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load saved returns'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteSavedTaxReturn(id);
      setReturns((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  };

  const handleEfile = async (id: number) => {
    setEfilingMessage(undefined);
    try {
      const submission = await efileTaxReturn(id);
      setEfilingMessage(
        `Ack #${submission.acknowledgementNumber} - ${submission.status}. ${submission.message}`,
      );
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'e-Filing submission failed');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button type="button" onClick={onBack} className="mb-6 text-sm font-medium text-indigo-600 hover:underline">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-slate-900">My Saved Returns</h1>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {efilingMessage && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{efilingMessage}</p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : returns.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          You haven&apos;t saved any tax calculations yet. Calculate your tax and click
          &quot;Save this calculation&quot; on the results page.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {returns.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {r.label || `Tax Return #${r.id}`} - {r.assessmentYear}
                  </p>
                  <p className="text-xs text-slate-500">
                    Saved {new Date(r.createdAt).toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-slate-700">
                    Total tax ({r.result.recommendedRegime} regime):{' '}
                    {formatCurrency(r.result[r.result.recommendedRegime].totalTaxLiability)}
                  </p>
                  {r.efilingStatus && (
                    <p className="text-xs text-emerald-700">
                      e-Filed: {r.efilingStatus} (Ack #{r.efilingAckNumber})
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={exportPdfUrl(r.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    PDF
                  </a>
                  <a
                    href={exportExcelUrl(r.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Excel
                  </a>
                  <button
                    type="button"
                    onClick={() => handleEfile(r.id)}
                    className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    e-File
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
