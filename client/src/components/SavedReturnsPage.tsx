import { useEffect, useState } from 'react';
import {
  ApiError,
  deleteSavedTaxReturn,
  efileTaxReturn,
  emailTaxReturn,
  exportExcelUrl,
  exportPdfUrl,
  getIntegrationStatus,
  listSavedTaxReturns,
  refreshEfilingStatus,
} from '../api';
import type { ItrTaxpayerInput, SavedTaxReturn } from '../api';

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
  const [simulatedEfiling, setSimulatedEfiling] = useState(true);
  const [efilingFormFor, setEfilingFormFor] = useState<number | undefined>();
  const [taxpayer, setTaxpayer] = useState<ItrTaxpayerInput>({
    pan: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
  });
  const [busyId, setBusyId] = useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;
    void getIntegrationStatus().then((status) => {
      if (!cancelled && status) setSimulatedEfiling(status.efiling.simulated);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const submitEfile = async (id: number, details?: ItrTaxpayerInput) => {
    setEfilingMessage(undefined);
    setError(undefined);
    setBusyId(id);
    try {
      const submission = await efileTaxReturn(id, details);
      setEfilingMessage(
        `Ack #${submission.acknowledgementNumber} - ${submission.status}. ${submission.message}`,
      );
      setEfilingFormFor(undefined);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'e-Filing submission failed');
    } finally {
      setBusyId(undefined);
    }
  };

  const handleEfile = (id: number) => {
    // A real intermediary needs the taxpayer identity for the ITR JSON; the mock provider does not.
    if (simulatedEfiling) {
      void submitEfile(id);
      return;
    }
    setEfilingMessage(undefined);
    setEfilingFormFor(id);
  };

  const handleRefreshStatus = async (id: number) => {
    setEfilingMessage(undefined);
    setError(undefined);
    setBusyId(id);
    try {
      const submission = await refreshEfilingStatus(id);
      setEfilingMessage(`Ack #${submission.acknowledgementNumber} - ${submission.status}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not refresh the filing status');
    } finally {
      setBusyId(undefined);
    }
  };

  const handleEmail = async (id: number) => {
    setEfilingMessage(undefined);
    setError(undefined);
    setBusyId(id);
    try {
      const result = await emailTaxReturn(id);
      setEfilingMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the email');
    } finally {
      setBusyId(undefined);
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
                      {r.efilingProvider ? ` via ${r.efilingProvider}` : ''}
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
                    onClick={() => void handleEmail(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Email PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEfile(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    e-File
                  </button>
                  {r.efilingStatus && (
                    <button
                      type="button"
                      onClick={() => void handleRefreshStatus(r.id)}
                      disabled={busyId === r.id}
                      className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      Refresh status
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {efilingFormFor === r.id && (
                <form
                  className="mt-4 space-y-3 rounded-md border border-indigo-200 bg-indigo-50/60 p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitEfile(r.id, {
                      ...taxpayer,
                      pan: taxpayer.pan.trim().toUpperCase(),
                    });
                  }}
                >
                  <p className="text-xs text-slate-600">
                    Filing through an authorised intermediary needs the details printed on your PAN
                    card so the ITR JSON can be generated.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">PAN</span>
                      <input
                        required
                        maxLength={10}
                        value={taxpayer.pan}
                        onChange={(e) => setTaxpayer((t) => ({ ...t, pan: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Date of birth</span>
                      <input
                        required
                        type="date"
                        value={taxpayer.dateOfBirth}
                        onChange={(e) => setTaxpayer((t) => ({ ...t, dateOfBirth: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">First name</span>
                      <input
                        value={taxpayer.firstName ?? ''}
                        onChange={(e) => setTaxpayer((t) => ({ ...t, firstName: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Surname</span>
                      <input
                        required
                        value={taxpayer.lastName}
                        onChange={(e) => setTaxpayer((t) => ({ ...t, lastName: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busyId === r.id}
                      className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {busyId === r.id ? 'Submitting…' : 'Submit to the e-filing portal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEfilingFormFor(undefined)}
                      className="rounded-md border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
