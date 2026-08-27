import type { HousePropertyType } from '@tax-break/tax-engine';
import type { FormState } from '../formTypes';
import { NumberField } from './NumberField';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

export function HousePropertySection({ form, onChange }: Props) {
  const houseProperty = form.houseProperty;

  const update = (patch: Partial<FormState['houseProperty']>) =>
    onChange((f) => ({ ...f, houseProperty: { ...f.houseProperty, ...patch } }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">3. House Property</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Property Type</span>
          <select
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            value={houseProperty.type}
            onChange={(e) => update({ type: e.target.value as HousePropertyType })}
          >
            <option value="self-occupied">Self-Occupied</option>
            <option value="let-out">Let-Out (Rented)</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Choose self-occupied if you live in the property, or let-out if it is rented out.
          </span>
        </label>
        <NumberField
          label="Home Loan Interest Paid (annual)"
          value={houseProperty.homeLoanInterest}
          onChange={(v) => update({ homeLoanInterest: v })}
          helpText={
            houseProperty.type === 'self-occupied'
              ? 'Capped at ₹2,00,000 under the Old Regime. Not deductible under the New Regime.'
              : 'No cap for let-out property.'
          }
        />
        {houseProperty.type === 'let-out' && (
          <>
            <NumberField
              label="Annual Rent Received"
              value={houseProperty.annualRentReceived}
              onChange={(v) => update({ annualRentReceived: v })}
              helpText="Total rent receivable for the year. A 30% standard deduction is applied automatically."
            />
            <NumberField
              label="Municipal Taxes Paid"
              value={houseProperty.municipalTaxesPaid}
              onChange={(v) => update({ municipalTaxesPaid: v })}
              helpText="Property tax actually paid to the local authority during the year; deducted from rent received."
            />
          </>
        )}
      </div>
    </section>
  );
}
