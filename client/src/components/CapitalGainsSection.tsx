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

function formatRate(rate: number): string {
  return `${Number((rate * 100).toFixed(2))}%`;
}

export function CapitalGainsSection({ form, onChange }: Props) {
  const capitalGains = form.capitalGains;
  const config = getConfig(form.assessmentYear);
  const rates = config.capitalGains;

  const update = (patch: Partial<FormState['capitalGains']>) =>
    onChange((f) => ({ ...f, capitalGains: { ...f.capitalGains, ...patch } }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">6. Capital Gains</h2>
      <p className="text-xs text-slate-500">
        Gains from selling shares, mutual funds, property, or other capital assets during the
        year. Rates shown are the ones applicable to {config.label}.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Short-Term Capital Gains - Listed Equity/Equity MF (Sec 111A)"
          value={capitalGains.equitySTCG}
          onChange={(v) => update({ equitySTCG: v })}
          helpText={`Equity sold within 12 months. Taxed at a flat ${formatRate(rates.equitySTCGRate)}, regardless of your slab.`}
        />
        <NumberField
          label="Long-Term Capital Gains - Listed Equity/Equity MF (Sec 112A)"
          value={capitalGains.equityLTCG}
          onChange={(v) => update({ equityLTCG: v })}
          helpText={`Equity held over 12 months. First ${formatCurrency(rates.equityLTCGExemption)} exempt per year, balance taxed at ${formatRate(rates.equityLTCGRate)}.`}
        />
        <NumberField
          label="Short-Term Capital Gains - Other Assets"
          value={capitalGains.otherSTCG}
          onChange={(v) => update({ otherSTCG: v })}
          helpText="Debt funds, unlisted shares or property held short-term. Added to your income and taxed at slab rates."
        />
        <NumberField
          label="Long-Term Capital Gains - Other Assets (Sec 112)"
          value={capitalGains.otherLTCG}
          onChange={(v) => update({ otherLTCG: v })}
          helpText={`Debt funds, property or unlisted shares held long-term, taxed at ${formatRate(rates.otherLTCGRate)}. Indexation benefit is not modelled.`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Tax Already Paid (TDS / Self-Assessment)"
          value={form.taxAlreadyPaid}
          onChange={(v) => onChange((f) => ({ ...f, taxAlreadyPaid: v }))}
          helpText="TDS from Form 16 / Form 26AS plus any advance or self-assessment tax already paid. Used to estimate your advance tax schedule and 234B/234C interest."
        />
      </div>
    </section>
  );
}
