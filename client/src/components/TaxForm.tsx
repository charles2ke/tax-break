import { useState } from 'react';
import type {
  InternationalTaxCalculationInput,
  TaxCalculationInput,
  TaxCountry,
  UsState,
} from '@tax-break/tax-engine';
import { listUsStates } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';
import { initialFormState } from '../formTypes';
import { BasicInfoSection } from './BasicInfoSection';
import { SalarySection } from './SalarySection';
import { HousePropertySection } from './HousePropertySection';
import { OtherIncomeSection } from './OtherIncomeSection';
import { DeductionsSection } from './DeductionsSection';
import { CapitalGainsSection } from './CapitalGainsSection';
import { NumberField } from './NumberField';

const US_STATES = listUsStates();

interface Props {
  onSubmit: (input: TaxCalculationInput | InternationalTaxCalculationInput) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

function toTaxCalculationInput(form: FormState): TaxCalculationInput {
  return {
    assessmentYear: form.assessmentYear,
    ageCategory: form.ageCategory,
    salary: form.salary,
    houseProperty: form.houseProperty,
    otherIncome: form.otherIncome,
    deductions: {
      section80C: form.deductions.section80C,
      section80D: form.deductions.section80D,
      section80CCD1B: form.deductions.section80CCD1B,
      section80E: form.deductions.section80E,
      section80G: form.deductions.section80G,
    },
    capitalGains: form.capitalGains,
    taxAlreadyPaid: form.taxAlreadyPaid,
  };
}

export function TaxForm({ onSubmit, isSubmitting, errorMessage }: Props) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [country, setCountry] = useState<TaxCountry>('india');
  const [annualIncome, setAnnualIncome] = useState(0);
  const [usState, setUsState] = useState<UsState>('CA');

  const handleChange = (updater: (f: FormState) => FormState) => setForm(updater);

  return (
    <form
      className="mx-auto max-w-3xl space-y-10 px-4 py-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (country === 'india') {
          onSubmit(toTaxCalculationInput(form));
        } else if (country === 'us') {
          onSubmit({ country, annualIncome, state: usState });
        } else {
          onSubmit({ country, annualIncome });
        }
      }}
    >
      <h1 className="text-2xl font-bold text-slate-900">Income & Deduction Details</h1>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Tax residence</span>
        <select
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          value={country}
          onChange={(e) => setCountry(e.target.value as TaxCountry)}
        >
          <option value="india">India</option>
          <option value="ireland">Ireland</option>
          <option value="netherlands">Netherlands</option>
          <option value="uk">United Kingdom</option>
          <option value="us">United States</option>
          <option value="singapore">Singapore</option>
        </select>
        <span className="mt-1 block text-xs text-slate-500">
          Pick the country whose income-tax rules should apply. India gives a full Old vs New Regime
          comparison; other countries give a simplified resident estimate.
        </span>
      </label>

      {country === 'india' ? (
        <>
          <BasicInfoSection form={form} onChange={handleChange} />
          <SalarySection form={form} onChange={handleChange} />
          <HousePropertySection form={form} onChange={handleChange} />
          <OtherIncomeSection form={form} onChange={handleChange} />
          <DeductionsSection form={form} onChange={handleChange} />
          <CapitalGainsSection form={form} onChange={handleChange} />
        </>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Annual Income</h2>
          <NumberField
            label="Gross annual income (local currency)"
            value={annualIncome}
            onChange={setAnnualIncome}
            helpText="Resident individual estimate. Payroll taxes, credits, allowances, and local taxes are excluded."
          />
          {country === 'us' && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">State of residence</span>
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={usState}
                onChange={(e) => setUsState(e.target.value as UsState)}
              >
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                State income tax is added to the federal estimate for a single filer. City and
                county income taxes (e.g. New York City, Maryland counties) are not included.
              </span>
            </label>
          )}
        </section>
      )}

      {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
      >
        {isSubmitting ? 'Calculating…' : 'Calculate Tax'}
      </button>
    </form>
  );
}
