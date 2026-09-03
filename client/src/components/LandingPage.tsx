import { useState } from 'react';
import type { TaxCountry } from '@tax-break/tax-engine';
import { COUNTRY_OPTIONS, getCountryOption } from '../countries';

interface LandingPageProps {
  onGetStarted: (country: TaxCountry) => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [country, setCountry] = useState<TaxCountry>('india');
  const selected = getCountryOption(country);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Tax Break</h1>
        <p className="mt-4 text-lg text-slate-600">
          Estimate your annual income tax in minutes. Start by choosing where you pay tax.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
          Step 1 · Choose your country
        </h2>
        <div
          role="radiogroup"
          aria-label="Country of tax residence"
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          {COUNTRY_OPTIONS.map((option) => {
            const isSelected = option.value === country;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setCountry(option.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <span className="text-3xl" aria-hidden="true">
                  {option.flag}
                </span>
                <span className="mt-2 block text-base font-semibold text-slate-900">
                  {option.label}
                </span>
                <span className="block text-xs text-slate-500">{option.currency}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          <span aria-hidden="true">{selected.flag}</span> What you get for {selected.label}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{selected.tagline}</p>
        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {selected.features.map((feature) => (
            <li key={feature} className="rounded-lg bg-slate-50 p-3">
              ✅ {feature}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onGetStarted(country)}
          className="mt-6 w-full rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 sm:w-auto"
        >
          Calculate my {selected.label} tax
        </button>
      </section>

      <p className="mt-8 text-center text-xs text-slate-400">
        This tool is for informational and estimation purposes only. It is not a substitute for
        professional tax advice or official e-filing.
      </p>
    </div>
  );
}
