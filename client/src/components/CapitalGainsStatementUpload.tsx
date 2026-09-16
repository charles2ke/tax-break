import { useRef, useState } from 'react';
import type { CapitalGainsStatementSummary } from '@tax-break/tax-engine';
import { parseCapitalGainsStatement } from '@tax-break/tax-engine';

interface Props {
  /** Which set of totals the caller wants to apply to its form fields. */
  variant: 'india' | 'us';
  onImport: (summary: CapitalGainsStatementSummary) => void;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Imports a broker capital gains statement: the tradewise CSV Indian brokers export, or the
 * consolidated Form 1099-B CSV from a US broker. The file is parsed in the browser and never
 * uploaded anywhere.
 */
export function CapitalGainsStatementUpload({ variant, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<CapitalGainsStatementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSummary(null);
    setFileName(file.name);

    if (/\.(pdf|xlsx?|ods)$/i.test(file.name)) {
      setError(
        'Only CSV files can be read here. Export the capital gains / realised P&L statement as ' +
          'CSV from your broker and upload that file.',
      );
      return;
    }

    try {
      const parsed = parseCapitalGainsStatement(await file.text());
      if (parsed.trades.length === 0) {
        setError('No closed positions were found in this file.');
        return;
      }
      const expectedFormat = variant === 'india' ? 'india-broker' : 'us-1099b';
      if (parsed.format !== expectedFormat) {
        const otherFormatLabel: Record<typeof parsed.format, string> = {
          'india-broker': 'an Indian broker statement',
          'us-1099b': 'a US Form 1099-B statement',
        };
        setError(
          `This looks like ${otherFormatLabel[parsed.format] ?? 'an unrecognised statement format'}. ` +
            (variant === 'india'
              ? 'Upload it in the US section instead.'
              : 'Upload it in the India section instead.'),
        );
        return;
      }
      onImport(parsed);
      setSummary(parsed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'That file could not be read. Please upload the CSV statement from your broker.',
      );
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        📈 Have your broker&apos;s capital gains statement?
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        {variant === 'india'
          ? 'Export the tradewise capital gains (realised P&L) report as CSV from your broker — Zerodha Console, ICICI Direct, HDFC Securities and others all offer it — and we will total your short-term and long-term gains for you.'
          : 'Export the consolidated Form 1099-B as CSV from your broker and we will total your short-term and long-term gains for you.'}{' '}
        The file is read in your browser and never uploaded anywhere.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Upload capital gains statement
        </button>
        {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}

      {summary && (
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <p className="font-medium text-emerald-700">
            Imported {summary.trades.length} closed position
            {summary.trades.length === 1 ? '' : 's'}:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {variant === 'india' ? (
              <>
                <li>
                  Equity short-term (Sec 111A):{' '}
                  {formatAmount(summary.india.equitySTCG, summary.currency)}
                </li>
                <li>
                  Equity long-term (Sec 112A):{' '}
                  {formatAmount(summary.india.equityLTCG, summary.currency)}
                </li>
                <li>
                  Other assets short-term: {formatAmount(summary.india.otherSTCG, summary.currency)}
                </li>
                <li>
                  Other assets long-term (Sec 112):{' '}
                  {formatAmount(summary.india.otherLTCG, summary.currency)}
                </li>
              </>
            ) : (
              <>
                <li>Short-term gains: {formatAmount(summary.us.shortTermGains, summary.currency)}</li>
                <li>Long-term gains: {formatAmount(summary.us.longTermGains, summary.currency)}</li>
              </>
            )}
          </ul>
          {summary.warnings.map((warning) => (
            <p key={warning} className="text-amber-700">
              {warning}
            </p>
          ))}
          <p className="text-slate-500">
            Losses are imported as negative amounts. Check the totals against your statement before
            filing; carried-forward losses and indexation are not applied.
          </p>
        </div>
      )}
    </div>
  );
}
