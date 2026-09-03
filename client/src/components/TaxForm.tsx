import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  InternationalTaxCalculationInput,
  TaxCalculationInput,
  TaxCountry,
  UsState,
} from '@tax-break/tax-engine';
import { listUsStates } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';
import { initialFormState } from '../formTypes';
import { COUNTRY_OPTIONS, getCountryOption } from '../countries';
import { BasicInfoSection } from './BasicInfoSection';
import { SalarySection } from './SalarySection';
import { HousePropertySection } from './HousePropertySection';
import { OtherIncomeSection } from './OtherIncomeSection';
import { DeductionsSection } from './DeductionsSection';
import { CapitalGainsSection } from './CapitalGainsSection';
import { Form26ASUpload } from './Form26ASUpload';
import {
  IrelandSection,
  IRELAND_STEP_TITLES,
  initialIrelandFormState,
  toIrelandTaxCalculationInput,
} from './IrelandSection';
import type { IrelandFormState } from './IrelandSection';
import {
  NetherlandsSection,
  NETHERLANDS_STEP_TITLES,
  initialNetherlandsFormState,
  toNetherlandsTaxCalculationInput,
} from './NetherlandsSection';
import type { NetherlandsFormState } from './NetherlandsSection';
import { NumberField } from './NumberField';

const US_STATES = listUsStates();

const SIMPLE_COUNTRY_EXAMPLES: Partial<Record<TaxCountry, string>> = {
  uk: '£55,000',
  us: '$85,000',
  singapore: 'S$120,000',
};

const INDIA_STEP_TITLES = [
  'Basic info',
  'Salary',
  'House property',
  'Other income',
  'Deductions',
  'Capital gains',
];

interface Props {
  onSubmit: (input: TaxCalculationInput | InternationalTaxCalculationInput) => void;
  isSubmitting: boolean;
  errorMessage?: string;
  initialCountry?: TaxCountry;
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

export function TaxForm({ onSubmit, isSubmitting, errorMessage, initialCountry }: Props) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [country, setCountry] = useState<TaxCountry>(initialCountry ?? 'india');
  const [step, setStep] = useState(0);
  const [annualIncome, setAnnualIncome] = useState(0);
  const [usState, setUsState] = useState<UsState>('CA');
  const [irelandForm, setIrelandForm] = useState<IrelandFormState>(initialIrelandFormState);
  const [netherlandsForm, setNetherlandsForm] = useState<NetherlandsFormState>(
    initialNetherlandsFormState,
  );

  const handleChange = (updater: (f: FormState) => FormState) => setForm(updater);
  const selectedCountry = getCountryOption(country);

  const steps = useMemo<{ title: string; content: ReactNode }[]>(() => {
    if (country === 'india') {
      const renderIndiaStep = (index: number): ReactNode => {
        switch (index) {
          case 1:
            return <SalarySection form={form} onChange={handleChange} />;
          case 2:
            return <HousePropertySection form={form} onChange={handleChange} />;
          case 3:
            return <OtherIncomeSection form={form} onChange={handleChange} />;
          case 4:
            return <DeductionsSection form={form} onChange={handleChange} />;
          case 5:
            return <CapitalGainsSection form={form} onChange={handleChange} />;
          default:
            return (
              <>
                <Form26ASUpload onChange={handleChange} />
                <BasicInfoSection form={form} onChange={handleChange} />
              </>
            );
        }
      };
      return INDIA_STEP_TITLES.map((title, index) => ({
        title,
        content: renderIndiaStep(index),
      }));
    }
    if (country === 'ireland') {
      return IRELAND_STEP_TITLES.map((title, index) => ({
        title,
        content: <IrelandSection form={irelandForm} onChange={setIrelandForm} step={index} />,
      }));
    }
    if (country === 'netherlands') {
      return NETHERLANDS_STEP_TITLES.map((title, index) => ({
        title,
        content: (
          <NetherlandsSection form={netherlandsForm} onChange={setNetherlandsForm} step={index} />
        ),
      }));
    }
    return [
      {
        title: 'Annual income',
        content: (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Annual Income</h2>
            <p className="text-xs text-slate-500">
              A simplified resident estimate for {selectedCountry.label}, in{' '}
              {selectedCountry.currency}.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={`Gross annual income (${selectedCountry.currency})`}
                value={annualIncome}
                onChange={setAnnualIncome}
                example={SIMPLE_COUNTRY_EXAMPLES[country]}
                helpText="Total gross income for the year before any tax, as shown on your payslip or annual statement. Payroll/social-security contributions are not deducted."
              />
              {country === 'us' && (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">State of residence</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    Example: California
                  </span>
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
                    The state you lived in for the year. Its income tax is added to the federal
                    estimate for a single filer. City and county income taxes (e.g. New York City,
                    Maryland counties) are not included.
                  </span>
                </label>
              )}
            </div>
          </section>
        ),
      },
    ];
  }, [country, form, irelandForm, netherlandsForm, annualIncome, usState, selectedCountry]);

  const currentStep = Math.min(step, steps.length - 1);
  const isLastStep = currentStep === steps.length - 1;

  const goToStep = (next: number) => {
    setStep(Math.max(0, Math.min(next, steps.length - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form
      className="mx-auto max-w-3xl space-y-8 px-4 py-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (country === 'india') {
          onSubmit(toTaxCalculationInput(form));
        } else if (country === 'ireland') {
          onSubmit(toIrelandTaxCalculationInput(irelandForm));
        } else if (country === 'netherlands') {
          onSubmit(toNetherlandsTaxCalculationInput(netherlandsForm));
        } else if (country === 'us') {
          onSubmit({ country, annualIncome, state: usState });
        } else {
          onSubmit({ country, annualIncome });
        }
      }}
    >
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Where do you pay tax?</h1>
        <p className="text-sm text-slate-600">
          Pick your country of tax residence first — it decides which questions you are asked and
          which currency is used.
        </p>
        <div
          role="radiogroup"
          aria-label="Country of tax residence"
          className="grid gap-3 sm:grid-cols-3"
        >
          {COUNTRY_OPTIONS.map((option) => {
            const isSelected = option.value === country;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setCountry(option.value);
                  setStep(0);
                }}
                className={`rounded-lg border p-3 text-left transition ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {option.flag}
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-900">
                  {option.label}
                </span>
                <span className="block text-xs text-slate-500">{option.currency}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">{selectedCountry.tagline}</p>
      </div>

      {steps.length > 1 && (
        <nav aria-label="Form steps" className="sticky top-0 z-10 space-y-2 bg-slate-50/95 py-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <ol className="flex flex-wrap gap-2">
            {steps.map((s, index) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-current={index === currentStep ? 'step' : undefined}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    index === currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {index + 1}. {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="space-y-6">{steps[currentStep].content}</div>

      {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0}
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ← Back
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isLastStep && (
            <button
              type="button"
              onClick={() => goToStep(currentStep + 1)}
              className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Next: {steps[currentStep + 1].title} →
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`rounded-md px-6 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60 ${
              isLastStep
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            {isSubmitting ? 'Calculating…' : 'Calculate Tax'}
          </button>
        </div>
      </div>
      {!isLastStep && (
        <p className="text-xs text-slate-500">
          Every field is optional — leave anything that does not apply to you empty and calculate
          whenever you are ready.
        </p>
      )}
    </form>
  );
}
