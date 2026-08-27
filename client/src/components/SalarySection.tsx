import type { CityType } from '@tax-break/tax-engine';
import { getConfig } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';
import { NumberField } from './NumberField';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SalarySection({ form, onChange }: Props) {
  const salary = form.salary;
  const config = getConfig(form.assessmentYear);

  const update = (patch: Partial<FormState['salary']>) =>
    onChange((f) => ({ ...f, salary: { ...f.salary, ...patch } }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">2. Salary Details</h2>
      <p className="text-xs text-slate-500">
        Enter annual figures from your Form 16 / salary slips, before any tax deduction. A standard
        deduction of {formatCurrency(config.old.standardDeduction)} (Old Regime) and{' '}
        {config.new.standardDeduction > 0
          ? `${formatCurrency(config.new.standardDeduction)} (New Regime)`
          : 'nil (New Regime)'}{' '}
        is applied automatically for {config.label}, limited to your salary income.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Basic Salary (annual)"
          value={salary.basic}
          onChange={(v) => update({ basic: v })}
          helpText="Annual basic pay (including dearness allowance, if any). Used as the base for the HRA exemption."
        />
        <NumberField
          label="HRA Received (annual)"
          value={salary.hraReceived}
          onChange={(v) => update({ hraReceived: v })}
          helpText="House rent allowance actually received during the year. Fully taxable under the New Regime."
        />
        <NumberField
          label="Rent Paid (annual)"
          value={salary.rentPaid}
          onChange={(v) => update({ rentPaid: v })}
          helpText="Total rent you paid for the year. Exemption is only available under the Old Regime, per Section 10(13A)."
        />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">City Type</span>
          <select
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            value={salary.cityType}
            onChange={(e) => update({ cityType: e.target.value as CityType })}
          >
            <option value="metro">Metro (Delhi, Mumbai, Kolkata, Chennai)</option>
            <option value="non-metro">Non-Metro</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            The HRA exemption is 50% of basic salary for metro cities and 40% elsewhere.
          </span>
        </label>
        <NumberField
          label="LTA (annual)"
          value={salary.lta}
          onChange={(v) => update({ lta: v })}
          helpText="Leave travel allowance received. Enter the taxable portion, i.e. after any exempt travel claim."
        />
        <NumberField
          label="Special Allowance (annual)"
          value={salary.specialAllowance}
          onChange={(v) => update({ specialAllowance: v })}
          helpText="All other taxable salary components: special allowance, bonus, perquisites, etc."
        />
      </div>
    </section>
  );
}
