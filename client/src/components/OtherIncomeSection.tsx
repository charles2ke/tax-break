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
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Savings Bank Interest"
          value={otherIncome.savingsInterest}
          onChange={(v) => update({ savingsInterest: v })}
          helpText="Interest credited on savings accounts. Drives the 80TTA/80TTB deduction."
        />
        <NumberField
          label="Fixed Deposit / Other Interest"
          value={otherIncome.otherInterest}
          onChange={(v) => update({ otherInterest: v })}
          helpText="Interest on fixed/recurring deposits, bonds, and loans given. Fully taxable."
        />
        <NumberField
          label="Dividend Income"
          value={otherIncome.dividendIncome}
          onChange={(v) => update({ dividendIncome: v })}
          helpText="Dividends from shares and mutual funds, taxable at your slab rate."
        />
        <NumberField
          label="Other Income"
          value={otherIncome.otherIncome}
          onChange={(v) => update({ otherIncome: v })}
          helpText="Any other taxable receipts, such as family pension, gifts, or winnings."
        />
      </div>
    </section>
  );
}
