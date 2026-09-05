import type { UkStudentLoanPlan, UkTaxCalculationInput } from '@tax-break/tax-engine';
import { NumberField } from './NumberField';

export interface UkFormState {
  annualIncome: number;
  bonus: number;
  taxableBenefits: number;
  selfEmploymentIncome: number;
  rentalIncome: number;
  savingsInterest: number;
  dividendIncome: number;
  pensionContributions: number;
  giftAidDonations: number;
  studentLoanPlan: UkStudentLoanPlan;
}

export const initialUkFormState: UkFormState = {
  annualIncome: 0,
  bonus: 0,
  taxableBenefits: 0,
  selfEmploymentIncome: 0,
  rentalIncome: 0,
  savingsInterest: 0,
  dividendIncome: 0,
  pensionContributions: 0,
  giftAidDonations: 0,
  studentLoanPlan: 'none',
};

const STUDENT_LOAN_OPTIONS: { value: UkStudentLoanPlan; label: string }[] = [
  { value: 'none', label: 'No student loan' },
  { value: 'plan1', label: 'Plan 1 (£26,065, 9%)' },
  { value: 'plan2', label: 'Plan 2 (£28,470, 9%)' },
  { value: 'plan4', label: 'Plan 4 - Scotland (£32,745, 9%)' },
  { value: 'plan5', label: 'Plan 5 (£25,000, 9%)' },
  { value: 'postgraduate', label: 'Postgraduate loan (£21,000, 6%)' },
];

export function toUkTaxCalculationInput(form: UkFormState): UkTaxCalculationInput {
  return {
    country: 'uk',
    annualIncome: form.annualIncome,
    bonus: form.bonus,
    taxableBenefits: form.taxableBenefits,
    selfEmploymentIncome: form.selfEmploymentIncome,
    rentalIncome: form.rentalIncome,
    savingsInterest: form.savingsInterest,
    dividendIncome: form.dividendIncome,
    pensionContributions: form.pensionContributions,
    giftAidDonations: form.giftAidDonations,
    studentLoanPlan: form.studentLoanPlan,
  };
}

export const UK_STEP_TITLES = ['Employment income', 'Other income', 'Reliefs & deductions'];

interface Props {
  form: UkFormState;
  onChange: (updater: (form: UkFormState) => UkFormState) => void;
  /** When set, only the section with this index is rendered (wizard mode). */
  step?: number;
}

export function UkSection({ form, onChange, step }: Props) {
  const update = (patch: Partial<UkFormState>) => onChange((f) => ({ ...f, ...patch }));
  const show = (index: number) => step === undefined || step === index;

  return (
    <div className="space-y-10">
      {show(0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">1. Employment Income</h2>
          <p className="text-xs text-slate-500">
            2025/26 rates for a resident of England, Wales or Northern Ireland. Scottish income tax
            rates are not applied.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Gross annual salary (£)"
              example="£55,000"
              value={form.annualIncome}
              onChange={(v) => update({ annualIncome: v })}
              helpText="Salary before tax and National Insurance, as shown on your payslip or P60."
            />
            <NumberField
              label="Bonus and commission (£)"
              example="£8,000"
              value={form.bonus}
              onChange={(v) => update({ bonus: v })}
              helpText="Bonus, commission or overtime paid through payroll during the tax year."
            />
            <NumberField
              label="Taxable benefits in kind (£)"
              example="£4,200"
              value={form.taxableBenefits}
              onChange={(v) => update({ taxableBenefits: v })}
              helpText="P11D benefits such as a company car or private medical cover. Taxed as income but not liable to employee National Insurance."
            />
          </div>
        </section>
      )}

      {show(1) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">2. Other Income</h2>
          <p className="text-xs text-slate-500">
            Savings interest and dividends are stacked on top of your other income and keep their
            own 0% allowances.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Self-employment profit (£)"
              example="£10,000"
              value={form.selfEmploymentIncome}
              onChange={(v) => update({ selfEmploymentIncome: v })}
              helpText="Profit from self-employment or freelancing after expenses. Class 2 and Class 4 National Insurance are not included."
            />
            <NumberField
              label="Property rental profit (£)"
              example="£7,500"
              value={form.rentalIncome}
              onChange={(v) => update({ rentalIncome: v })}
              helpText="Rental income less allowable expenses. The mortgage interest tax reducer is not applied."
            />
            <NumberField
              label="Savings interest (£)"
              example="£1,200"
              value={form.savingsInterest}
              onChange={(v) => update({ savingsInterest: v })}
              helpText="Interest from bank accounts and bonds. The first £1,000 (£500 for higher rate taxpayers) is tax free, plus up to £5,000 of the starting rate for savings."
            />
            <NumberField
              label="Dividend income (£)"
              example="£3,000"
              value={form.dividendIncome}
              onChange={(v) => update({ dividendIncome: v })}
              helpText="Dividends from shares and funds held outside an ISA. The first £500 is tax free; the rest is taxed at 8.75%, 33.75% or 39.35%."
            />
          </div>
        </section>
      )}

      {show(2) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">3. Reliefs & Deductions</h2>
          <p className="text-xs text-slate-500">
            Pension contributions reduce your taxable income, and Gift Aid donations widen the basic
            and higher rate bands.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Pension contributions (£)"
              example="£4,000"
              value={form.pensionContributions}
              onChange={(v) => update({ pensionContributions: v })}
              helpText="Your own workplace or personal pension contributions for the year. They also help restore the personal allowance if you earn over £100,000."
            />
            <NumberField
              label="Gift Aid donations (£)"
              example="£500"
              value={form.giftAidDonations}
              onChange={(v) => update({ giftAidDonations: v })}
              helpText="Donations including the basic rate tax the charity reclaims (enter the gross amount). They extend your basic and higher rate bands."
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Student loan plan</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-400">
                Example: Plan 2
              </span>
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={form.studentLoanPlan}
                onChange={(e) => update({ studentLoanPlan: e.target.value as UkStudentLoanPlan })}
              >
                {STUDENT_LOAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Repayments are taken from earnings above the plan threshold and added to your total
                deductions.
              </span>
            </label>
          </div>
        </section>
      )}
    </div>
  );
}
