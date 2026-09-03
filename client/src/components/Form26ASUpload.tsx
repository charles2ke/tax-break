import { useRef, useState } from 'react';
import type { Form26ASSummary } from '@tax-break/tax-engine';
import { parseForm26AS } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';

interface Props {
  onChange: (updater: (form: FormState) => FormState) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function applySummary(form: FormState, summary: Form26ASSummary): FormState {
  return {
    ...form,
    salary: {
      ...form.salary,
      // The statement only reports the total salary credited, not its components,
      // so it goes into the fully taxable "other salary" bucket.
      specialAllowance: summary.salaryIncome,
    },
    otherIncome: {
      ...form.otherIncome,
      otherInterest: summary.interestIncome,
      dividendIncome: summary.dividendIncome,
      otherIncome: summary.otherIncome,
    },
    taxAlreadyPaid: summary.totalTaxPaid,
  };
}

export function Form26ASUpload({ onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<Form26ASSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSummary(null);
    setFileName(file.name);

    if (/\.pdf$/i.test(file.name)) {
      setError(
        'PDF statements cannot be read here. On TRACES choose "Text" as the View As / download format and upload that file (a .txt or .csv).',
      );
      return;
    }

    try {
      const contents = await file.text();
      const parsed = parseForm26AS(contents);
      if (parsed.sections.length === 0 && parsed.advanceAndSelfAssessmentTax === 0) {
        setError(
          'No TDS entries were found in this file. Please upload the text (.txt) or CSV export of Form 26AS downloaded from TRACES.',
        );
        return;
      }
      onChange((form) => applySummary(form, parsed));
      setSummary(parsed);
    } catch {
      setError('That file could not be read. Please upload the text or CSV export of Form 26AS.');
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        📄 Have your Form 26AS? Fill the form automatically
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        Form 26AS is your annual tax statement from the income tax portal (Login → e-File → Income
        Tax Returns → View Form 26AS → select the assessment year → download as{' '}
        <strong>Text</strong>). Upload that <code>.txt</code> or <code>.csv</code> file and we will
        fill in your salary, interest, dividends and the tax already deducted. The file is read in
        your browser and never uploaded anywhere.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.tsv,text/plain,text/csv"
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
          Upload Form 26AS
        </button>
        {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}

      {summary && (
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <p className="font-medium text-emerald-700">
            Imported {summary.sections.length} section
            {summary.sections.length === 1 ? '' : 's'} from your statement:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Salary (Sec 192) → Special allowance: {formatCurrency(summary.salaryIncome)}</li>
            <li>
              Interest → Fixed deposit / other interest: {formatCurrency(summary.interestIncome)}
            </li>
            <li>Dividends → Dividend income: {formatCurrency(summary.dividendIncome)}</li>
            <li>Other receipts → Other income: {formatCurrency(summary.otherIncome)}</li>
            <li>TDS and challans → Tax already paid: {formatCurrency(summary.totalTaxPaid)}</li>
          </ul>
          <p className="text-slate-500">
            Form 26AS does not show your salary breakup, so the whole salary is added as special
            allowance. Move your basic pay and HRA into their own fields if you want to claim the
            HRA exemption, and add your 80C/80D deductions yourself.
          </p>
        </div>
      )}
    </div>
  );
}
