import { useState } from 'react';
import type { TaxCalculationInput } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';
import { initialFormState } from '../formTypes';
import { BasicInfoSection } from './BasicInfoSection';
import { SalarySection } from './SalarySection';
import { HousePropertySection } from './HousePropertySection';
import { OtherIncomeSection } from './OtherIncomeSection';
import { DeductionsSection } from './DeductionsSection';

interface Props {
  onSubmit: (input: TaxCalculationInput) => void;
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
  };
}

export function TaxForm({ onSubmit, isSubmitting, errorMessage }: Props) {
  const [form, setForm] = useState<FormState>(initialFormState);

  const handleChange = (updater: (f: FormState) => FormState) => setForm(updater);

  return (
    <form
      className="mx-auto max-w-3xl space-y-10 px-4 py-10"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(toTaxCalculationInput(form));
      }}
    >
      <h1 className="text-2xl font-bold text-slate-900">Income & Deduction Details</h1>

      <BasicInfoSection form={form} onChange={handleChange} />
      <SalarySection form={form} onChange={handleChange} />
      <HousePropertySection form={form} onChange={handleChange} />
      <OtherIncomeSection form={form} onChange={handleChange} />
      <DeductionsSection form={form} onChange={handleChange} />

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
