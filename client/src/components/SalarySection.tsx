import type { CityType } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';
import { NumberField } from './NumberField';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

export function SalarySection({ form, onChange }: Props) {
  const salary = form.salary;

  const update = (patch: Partial<FormState['salary']>) =>
    onChange((f) => ({ ...f, salary: { ...f.salary, ...patch } }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">2. Salary Details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Basic Salary (annual)"
          value={salary.basic}
          onChange={(v) => update({ basic: v })}
          helpText="Basic pay plus dearness allowance for the year, as shown on your payslip or Form 16."
        />
        <NumberField
          label="HRA Received (annual)"
          value={salary.hraReceived}
          onChange={(v) => update({ hraReceived: v })}
          helpText="House rent allowance actually paid to you during the year."
        />
        <NumberField
          label="Rent Paid (annual)"
          value={salary.rentPaid}
          onChange={(v) => update({ rentPaid: v })}
          helpText="Exemption is only available under the Old Regime, per Section 10(13A)."
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
            Metro cities allow an HRA exemption of 50% of basic salary, non-metro only 40%.
          </span>
        </label>
        <NumberField
          label="LTA (annual)"
          value={salary.lta}
          onChange={(v) => update({ lta: v })}
          helpText="Leave travel allowance received. Treated as taxable salary unless you claim the exemption while filing."
        />
        <NumberField
          label="Special Allowance (annual)"
          value={salary.specialAllowance}
          onChange={(v) => update({ specialAllowance: v })}
          helpText="Any remaining fully taxable salary components, such as special or performance allowance."
        />
      </div>
    </section>
  );
}
