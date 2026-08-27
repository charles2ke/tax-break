import type { FormState } from '../formTypes';
import { NumberField } from './NumberField';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

export function CapitalGainsSection({ form, onChange }: Props) {
  const capitalGains = form.capitalGains;

  const update = (patch: Partial<FormState['capitalGains']>) =>
    onChange((f) => ({ ...f, capitalGains: { ...f.capitalGains, ...patch } }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">5. Capital Gains</h2>
      <p className="text-xs text-slate-500">
        Gains from selling shares, mutual funds, property, or other capital assets during the
        year.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Short-Term Capital Gains - Listed Equity/Equity MF (Sec 111A)"
          value={capitalGains.equitySTCG}
          onChange={(v) => update({ equitySTCG: v })}
          helpText="Taxed at a flat 20%."
        />
        <NumberField
          label="Long-Term Capital Gains - Listed Equity/Equity MF (Sec 112A)"
          value={capitalGains.equityLTCG}
          onChange={(v) => update({ equityLTCG: v })}
          helpText="First ₹1,25,000 exempt per year, balance taxed at 12.5%."
        />
        <NumberField
          label="Short-Term Capital Gains - Other Assets"
          value={capitalGains.otherSTCG}
          onChange={(v) => update({ otherSTCG: v })}
          helpText="Debt funds, unlisted shares, property held short-term; taxed at slab rates."
        />
        <NumberField
          label="Long-Term Capital Gains - Other Assets (Sec 112)"
          value={capitalGains.otherLTCG}
          onChange={(v) => update({ otherLTCG: v })}
          helpText="Debt funds, property, unlisted shares held long-term; taxed at 12.5%."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Tax Already Paid (TDS / Self-Assessment)"
          value={form.taxAlreadyPaid}
          onChange={(v) => onChange((f) => ({ ...f, taxAlreadyPaid: v }))}
          helpText="Used to estimate your advance tax installment schedule and interest, if any."
        />
      </div>
    </section>
  );
}
