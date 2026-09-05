import type { SingaporeAgeBand, SingaporeTaxCalculationInput } from '@tax-break/tax-engine';
import { NumberField } from './NumberField';

export interface SingaporeFormState {
  annualIncome: number;
  bonus: number;
  directorsFees: number;
  taxableBenefits: number;
  rentalIncome: number;
  otherIncome: number;
  employmentExpenses: number;
  approvedDonations: number;
  ageBand: SingaporeAgeBand;
  cpfContributions: number;
  cpfCashTopUp: number;
  srsContributions: number;
  spouseRelief: boolean;
  qualifyingChildren: number;
  dependantParents: number;
  nsmanRelief: boolean;
  courseFees: number;
  lifeInsurancePremiums: number;
  foreignMaidLevy: number;
}

export const initialSingaporeFormState: SingaporeFormState = {
  annualIncome: 0,
  bonus: 0,
  directorsFees: 0,
  taxableBenefits: 0,
  rentalIncome: 0,
  otherIncome: 0,
  employmentExpenses: 0,
  approvedDonations: 0,
  ageBand: 'below55',
  cpfContributions: 0,
  cpfCashTopUp: 0,
  srsContributions: 0,
  spouseRelief: false,
  qualifyingChildren: 0,
  dependantParents: 0,
  nsmanRelief: false,
  courseFees: 0,
  lifeInsurancePremiums: 0,
  foreignMaidLevy: 0,
};

const AGE_BAND_OPTIONS: { value: SingaporeAgeBand; label: string }[] = [
  { value: 'below55', label: 'Below 55 ($1,000 earned income relief)' },
  { value: '55to59', label: '55 to 59 ($6,000 earned income relief)' },
  { value: '60plus', label: '60 and above ($8,000 earned income relief)' },
];

export function toSingaporeTaxCalculationInput(
  form: SingaporeFormState,
): SingaporeTaxCalculationInput {
  return {
    country: 'singapore',
    annualIncome: form.annualIncome,
    bonus: form.bonus,
    directorsFees: form.directorsFees,
    taxableBenefits: form.taxableBenefits,
    rentalIncome: form.rentalIncome,
    otherIncome: form.otherIncome,
    employmentExpenses: form.employmentExpenses,
    approvedDonations: form.approvedDonations,
    ageBand: form.ageBand,
    reliefs: {
      cpfContributions: form.cpfContributions,
      cpfCashTopUp: form.cpfCashTopUp,
      srsContributions: form.srsContributions,
      spouseRelief: form.spouseRelief,
      qualifyingChildren: form.qualifyingChildren,
      dependantParents: form.dependantParents,
      nsmanRelief: form.nsmanRelief,
      courseFees: form.courseFees,
      lifeInsurancePremiums: form.lifeInsurancePremiums,
      foreignMaidLevy: form.foreignMaidLevy,
    },
  };
}

export const SINGAPORE_STEP_TITLES = [
  'Employment income',
  'Other income & deductions',
  'CPF & retirement reliefs',
  'Family & other reliefs',
];

interface Props {
  form: SingaporeFormState;
  onChange: (updater: (form: SingaporeFormState) => SingaporeFormState) => void;
  /** When set, only the section with this index is rendered (wizard mode). */
  step?: number;
}

export function SingaporeSection({ form, onChange, step }: Props) {
  const update = (patch: Partial<SingaporeFormState>) => onChange((f) => ({ ...f, ...patch }));
  const show = (index: number) => step === undefined || step === index;

  return (
    <div className="space-y-10">
      {show(0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">1. Employment Income</h2>
          <p className="text-xs text-slate-500">
            Year of Assessment 2025 resident rates. Enter the income you earned in the calendar year
            being assessed.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Gross annual salary (S$)"
              example="S$120,000"
              value={form.annualIncome}
              onChange={(v) => update({ annualIncome: v })}
              helpText="Salary before CPF, as shown on your IR8A form."
            />
            <NumberField
              label="Bonus and commission (S$)"
              example="S$20,000"
              value={form.bonus}
              onChange={(v) => update({ bonus: v })}
              helpText="AWS, performance bonus and commission paid during the year."
            />
            <NumberField
              label="Director's fees (S$)"
              example="S$10,000"
              value={form.directorsFees}
              onChange={(v) => update({ directorsFees: v })}
              helpText="Fees approved for your services as a company director."
            />
            <NumberField
              label="Taxable benefits in kind (S$)"
              example="S$6,000"
              value={form.taxableBenefits}
              onChange={(v) => update({ taxableBenefits: v })}
              helpText="Benefits such as employer-provided accommodation or a car."
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Age on 31 December</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-400">
                Example: Below 55
              </span>
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={form.ageBand}
                onChange={(e) => update({ ageBand: e.target.value as SingaporeAgeBand })}
              >
                {AGE_BAND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Earned income relief is granted automatically and grows with your age band.
              </span>
            </label>
          </div>
        </section>
      )}

      {show(1) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">2. Other Income & Deductions</h2>
          <p className="text-xs text-slate-500">
            Deductions come off your income before personal reliefs. Approved donations attract a
            250% deduction.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Net rental income (S$)"
              example="S$18,000"
              value={form.rentalIncome}
              onChange={(v) => update({ rentalIncome: v })}
              helpText="Rent received less mortgage interest, property tax and other deductible expenses."
            />
            <NumberField
              label="Trade or other income (S$)"
              example="S$8,000"
              value={form.otherIncome}
              onChange={(v) => update({ otherIncome: v })}
              helpText="Freelance, business or other taxable income. Singapore does not tax capital gains or most dividends."
            />
            <NumberField
              label="Employment expenses (S$)"
              example="S$1,500"
              value={form.employmentExpenses}
              onChange={(v) => update({ employmentExpenses: v })}
              helpText="Expenses incurred wholly in producing your employment income and not reimbursed by your employer."
            />
            <NumberField
              label="Approved donations (S$)"
              example="S$1,000"
              value={form.approvedDonations}
              onChange={(v) => update({ approvedDonations: v })}
              helpText="Cash donations to approved IPCs. Each dollar given is deducted at 250%."
            />
          </div>
        </section>
      )}

      {show(2) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">3. CPF & Retirement Reliefs</h2>
          <p className="text-xs text-slate-500">
            CPF and SRS reliefs are part of the $80,000 cap on total personal reliefs.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Compulsory CPF contributions (S$)"
              example="S$20,400"
              value={form.cpfContributions}
              onChange={(v) => update({ cpfContributions: v })}
              helpText="Your own employee CPF contributions for the year. Only Singapore citizens and permanent residents contribute."
            />
            <NumberField
              label="CPF cash top-ups (S$)"
              example="S$8,000"
              value={form.cpfCashTopUp}
              onChange={(v) => update({ cpfCashTopUp: v })}
              helpText="Cash top-ups to your own or a family member's Special/Retirement Account. Relieved up to $16,000."
            />
            <NumberField
              label="SRS contributions (S$)"
              example="S$15,300"
              value={form.srsContributions}
              onChange={(v) => update({ srsContributions: v })}
              helpText="Supplementary Retirement Scheme contributions, relieved up to $15,300 for citizens and PRs."
            />
            <NumberField
              label="Life insurance premiums (S$)"
              example="S$2,000"
              value={form.lifeInsurancePremiums}
              onChange={(v) => update({ lifeInsurancePremiums: v })}
              helpText="Only available when your CPF contributions are below $5,000, and limited to the difference."
            />
          </div>
        </section>
      )}

      {show(3) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">4. Family & Other Reliefs</h2>
          <p className="text-xs text-slate-500">
            Total personal reliefs are capped at $80,000 for the year of assessment.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.spouseRelief}
              onChange={(e) => update({ spouseRelief: e.target.checked })}
            />
            <span className="text-sm text-slate-700">
              Claim spouse relief
              <span className="block text-xs text-slate-500">
                $2,000 relief when your spouse lived with you and earned $4,000 or less.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.nsmanRelief}
              onChange={(e) => update({ nsmanRelief: e.target.checked })}
            />
            <span className="text-sm text-slate-700">
              Claim NSman (self) relief
              <span className="block text-xs text-slate-500">
                $3,000 relief for operationally ready national servicemen who did not perform NS
                activities in the year.
              </span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Qualifying children"
              example="2"
              value={form.qualifyingChildren}
              onChange={(v) => update({ qualifyingChildren: v })}
              helpText="Children claimed under Qualifying Child Relief, at $4,000 each."
            />
            <NumberField
              label="Dependant parents"
              example="1"
              value={form.dependantParents}
              onChange={(v) => update({ dependantParents: v })}
              helpText="Parents, grandparents or in-laws you support and who live with you, at $9,000 each."
            />
            <NumberField
              label="Course fees paid (S$)"
              example="S$5,500"
              value={form.courseFees}
              onChange={(v) => update({ courseFees: v })}
              helpText="Fees for approved courses related to your trade or profession, relieved up to $5,500."
            />
            <NumberField
              label="Foreign domestic worker levy (S$)"
              example="S$1,440"
              value={form.foreignMaidLevy}
              onChange={(v) => update({ foreignMaidLevy: v })}
              helpText="Levy paid in the year, claimable by married, divorced or widowed women."
            />
          </div>
        </section>
      )}
    </div>
  );
}
