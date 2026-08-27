import type { FormState } from '../formTypes';
import { NumberField } from './NumberField';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

export function OtherIncomeSection({ form, onChange }: Props) {
  const otherIncome = form.otherIncome;

  const update = (patch: Partial<FormState['otherIncome']>) =>
    onChange((f) => ({ ...f, otherIncome: { ...f.otherIncome, ...patch } }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">4. Income From Other Sources</h2>
      <p className="text-xs text-slate-500">
        Interest and other income earned during the year, as reported in your AIS / Form 26AS.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Savings Bank Interest"
          value={otherIncome.savingsInterest}
          onChange={(v) => update({ savingsInterest: v })}
          helpText="Interest credited on savings accounts. Deductible up to ₹10,000 under 80TTA (₹50,000 under 80TTB for senior citizens), Old Regime only."
        />
        <NumberField
          label="Fixed Deposit / Other Interest"
          value={otherIncome.otherInterest}
          onChange={(v) => update({ otherInterest: v })}
          helpText="Interest on fixed/recurring deposits, bonds and loans. Fully taxable, except for senior citizens claiming 80TTB."
        />
        <NumberField
          label="Dividend Income"
          value={otherIncome.dividendIncome}
          onChange={(v) => update({ dividendIncome: v })}
          helpText="Dividends from shares and mutual funds. Taxable at your slab rate since FY 2020-21."
        />
        <NumberField
          label="Other Income"
          value={otherIncome.otherIncome}
          onChange={(v) => update({ otherIncome: v })}
          helpText="Any other taxable income, e.g. family pension, gifts or freelance receipts, taxed at slab rates."
        />
      </div>
    </section>
  );
}
