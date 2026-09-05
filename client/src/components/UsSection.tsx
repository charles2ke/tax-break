import type { UsFilingStatus, UsState, UsTaxCalculationInput } from '@tax-break/tax-engine';
import { listUsStates } from '@tax-break/tax-engine';
import { NumberField } from './NumberField';

const US_STATES = listUsStates();

export interface UsFormState {
  filingStatus: UsFilingStatus;
  state: UsState;
  annualIncome: number;
  bonus: number;
  selfEmploymentIncome: number;
  otherIncome: number;
  interestIncome: number;
  ordinaryDividends: number;
  qualifiedDividends: number;
  shortTermCapitalGains: number;
  longTermCapitalGains: number;
  retirementContributions: number;
  hsaContributions: number;
  studentLoanInterest: number;
  itemizedDeductions: number;
  dependentsUnder17: number;
  otherDependents: number;
}

export const initialUsFormState: UsFormState = {
  filingStatus: 'single',
  state: 'CA',
  annualIncome: 0,
  bonus: 0,
  selfEmploymentIncome: 0,
  otherIncome: 0,
  interestIncome: 0,
  ordinaryDividends: 0,
  qualifiedDividends: 0,
  shortTermCapitalGains: 0,
  longTermCapitalGains: 0,
  retirementContributions: 0,
  hsaContributions: 0,
  studentLoanInterest: 0,
  itemizedDeductions: 0,
  dependentsUnder17: 0,
  otherDependents: 0,
};

const FILING_STATUS_OPTIONS: { value: UsFilingStatus; label: string }[] = [
  { value: 'single', label: 'Single ($15,750 standard deduction)' },
  { value: 'marriedJoint', label: 'Married filing jointly ($31,500)' },
  { value: 'marriedSeparate', label: 'Married filing separately ($15,750)' },
  { value: 'headOfHousehold', label: 'Head of household ($23,625)' },
];

export function toUsTaxCalculationInput(form: UsFormState): UsTaxCalculationInput {
  return {
    country: 'us',
    filingStatus: form.filingStatus,
    state: form.state,
    annualIncome: form.annualIncome,
    bonus: form.bonus,
    selfEmploymentIncome: form.selfEmploymentIncome,
    otherIncome: form.otherIncome,
    interestIncome: form.interestIncome,
    ordinaryDividends: form.ordinaryDividends,
    qualifiedDividends: form.qualifiedDividends,
    shortTermCapitalGains: form.shortTermCapitalGains,
    longTermCapitalGains: form.longTermCapitalGains,
    retirementContributions: form.retirementContributions,
    hsaContributions: form.hsaContributions,
    studentLoanInterest: form.studentLoanInterest,
    itemizedDeductions: form.itemizedDeductions,
    dependentsUnder17: form.dependentsUnder17,
    otherDependents: form.otherDependents,
  };
}

export const US_STEP_TITLES = [
  'Filing status & state',
  'Wages & other income',
  'Investment income',
  'Adjustments & deductions',
];

interface Props {
  form: UsFormState;
  onChange: (updater: (form: UsFormState) => UsFormState) => void;
  /** When set, only the section with this index is rendered (wizard mode). */
  step?: number;
}

export function UsSection({ form, onChange, step }: Props) {
  const update = (patch: Partial<UsFormState>) => onChange((f) => ({ ...f, ...patch }));
  const show = (index: number) => step === undefined || step === index;

  return (
    <div className="space-y-10">
      {show(0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">1. Filing Status & State</h2>
          <p className="text-xs text-slate-500">
            2025 federal rates. Your filing status sets the standard deduction, the tax brackets and
            the income thresholds for credits and surtaxes.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Filing status</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-400">
                Example: Single
              </span>
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={form.filingStatus}
                onChange={(e) => update({ filingStatus: e.target.value as UsFilingStatus })}
              >
                {FILING_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                The status you file your Form 1040 under.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">State of residence</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-400">
                Example: California
              </span>
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={form.state}
                onChange={(e) => update({ state: e.target.value as UsState })}
              >
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                State income tax is estimated using single-filer brackets. City and county income
                taxes are not included.
              </span>
            </label>
            <NumberField
              label="Children under 17"
              example="2"
              value={form.dependentsUnder17}
              onChange={(v) => update({ dependentsUnder17: v })}
              helpText="Qualifying children for the $2,200 child tax credit, which phases out above $200,000 ($400,000 if married filing jointly)."
            />
            <NumberField
              label="Other dependents"
              example="1"
              value={form.otherDependents}
              onChange={(v) => update({ otherDependents: v })}
              helpText="Dependents who do not qualify as children under 17. Each attracts the $500 credit for other dependents."
            />
          </div>
        </section>
      )}

      {show(1) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">2. Wages & Other Income</h2>
          <p className="text-xs text-slate-500">
            Enter income before tax. Social Security and Medicare tax is estimated on your wages and
            self-employment earnings.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Wages ($)"
              example="$85,000"
              value={form.annualIncome}
              onChange={(v) => update({ annualIncome: v })}
              helpText="Gross wages from box 1 of your W-2, before pre-tax deductions entered below."
            />
            <NumberField
              label="Bonus and supplemental wages ($)"
              example="$10,000"
              value={form.bonus}
              onChange={(v) => update({ bonus: v })}
              helpText="Bonus, commission and other supplemental pay reported on your W-2."
            />
            <NumberField
              label="Self-employment profit ($)"
              example="$20,000"
              value={form.selfEmploymentIncome}
              onChange={(v) => update({ selfEmploymentIncome: v })}
              helpText="Net profit from a business or 1099 work. Self-employment tax of 15.3% applies, and half of it is deducted from your income."
            />
            <NumberField
              label="Other taxable income ($)"
              example="$5,000"
              value={form.otherIncome}
              onChange={(v) => update({ otherIncome: v })}
              helpText="Rental profit, taxable retirement distributions and other ordinary income."
            />
          </div>
        </section>
      )}

      {show(2) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">3. Investment Income</h2>
          <p className="text-xs text-slate-500">
            Qualified dividends and long-term gains are taxed at 0%, 15% or 20% on top of your
            ordinary income. Investment income over $200,000 ($250,000 jointly) also attracts the
            3.8% net investment income tax.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Taxable interest ($)"
              example="$1,500"
              value={form.interestIncome}
              onChange={(v) => update({ interestIncome: v })}
              helpText="Interest from bank accounts and bonds, from Form 1099-INT. Taxed at ordinary rates."
            />
            <NumberField
              label="Ordinary dividends ($)"
              example="$800"
              value={form.ordinaryDividends}
              onChange={(v) => update({ ordinaryDividends: v })}
              helpText="Non-qualified dividends taxed at your ordinary rate."
            />
            <NumberField
              label="Qualified dividends ($)"
              example="$2,000"
              value={form.qualifiedDividends}
              onChange={(v) => update({ qualifiedDividends: v })}
              helpText="Dividends taxed at the preferential long-term capital gains rates, from box 1b of Form 1099-DIV."
            />
            <NumberField
              label="Short-term capital gains ($)"
              example="$3,000"
              value={form.shortTermCapitalGains}
              onChange={(v) => update({ shortTermCapitalGains: v })}
              helpText="Net gains on assets held for a year or less. Taxed at ordinary rates."
            />
            <NumberField
              label="Long-term capital gains ($)"
              example="$12,000"
              value={form.longTermCapitalGains}
              onChange={(v) => update({ longTermCapitalGains: v })}
              helpText="Net gains on assets held for more than a year, including vested shares you sold later."
            />
          </div>
        </section>
      )}

      {show(3) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">4. Adjustments & Deductions</h2>
          <p className="text-xs text-slate-500">
            Pre-tax contributions reduce your adjusted gross income. Itemised deductions are used
            only when they beat your standard deduction.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Traditional 401(k)/IRA contributions ($)"
              example="$15,000"
              value={form.retirementContributions}
              onChange={(v) => update({ retirementContributions: v })}
              helpText="Pre-tax retirement contributions for the year. Roth contributions are not deductible, so leave them out."
            />
            <NumberField
              label="HSA contributions ($)"
              example="$4,300"
              value={form.hsaContributions}
              onChange={(v) => update({ hsaContributions: v })}
              helpText="Pre-tax contributions to a health savings account."
            />
            <NumberField
              label="Student loan interest paid ($)"
              example="$1,200"
              value={form.studentLoanInterest}
              onChange={(v) => update({ studentLoanInterest: v })}
              helpText="Deductible above the line, up to $2,500 a year."
            />
            <NumberField
              label="Itemised deductions ($)"
              example="$22,000"
              value={form.itemizedDeductions}
              onChange={(v) => update({ itemizedDeductions: v })}
              helpText="Total of mortgage interest, state and local taxes and charitable gifts. Leave empty to take the standard deduction."
            />
          </div>
        </section>
      )}
    </div>
  );
}
