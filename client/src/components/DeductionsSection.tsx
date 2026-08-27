import type { FormState } from '../formTypes';
import { NumberField } from './NumberField';

interface Props {
  form: FormState;
  onChange: (updater: (form: FormState) => FormState) => void;
}

export function DeductionsSection({ form, onChange }: Props) {
  const deductions = form.deductions;
  const isSenior = form.ageCategory === '60to80' || form.ageCategory === 'above80';

  const update = (patch: Partial<FormState['deductions']>) =>
    onChange((f) => ({ ...f, deductions: { ...f.deductions, ...patch } }));

  const update80D = (patch: Partial<FormState['deductions']['section80D']>) =>
    onChange((f) => ({
      ...f,
      deductions: { ...f.deductions, section80D: { ...f.deductions.section80D, ...patch } },
    }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">5. Deductions (Old Regime only)</h2>
      <p className="text-xs text-slate-500">
        These deductions are only applied when computing tax under the Old Regime. The New Regime
        only allows the standard deduction.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Section 80C"
          value={deductions.section80C}
          onChange={(v) => update({ section80C: v })}
          helpText="Max ₹1,50,000 (PF, PPF, ELSS, life insurance, tuition fees, etc.)"
        />
        <NumberField
          label="Section 80CCD(1B) - NPS"
          value={deductions.section80CCD1B}
          onChange={(v) => update({ section80CCD1B: v })}
          helpText="Additional ₹50,000 over and above 80C."
        />
        <NumberField
          label="80D - Health Insurance (Self & Family)"
          value={deductions.section80D.selfAndFamilyPremium}
          onChange={(v) => update80D({ selfAndFamilyPremium: v })}
          helpText="Max ₹25,000 (₹50,000 if you are a senior citizen)."
        />
        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            checked={deductions.section80D.selfSenior}
            onChange={(e) => update80D({ selfSenior: e.target.checked })}
          />
          <span className="text-sm text-slate-700">
            I am a senior citizen (60+)
            <span className="block text-xs text-slate-500">
              Raises the 80D cap for your own premium from ₹25,000 to ₹50,000.
            </span>
          </span>
        </label>
        <NumberField
          label="80D - Health Insurance (Parents)"
          value={deductions.section80D.parentsPremium}
          onChange={(v) => update80D({ parentsPremium: v })}
          helpText="Max ₹25,000 (₹50,000 if parents are senior citizens)."
        />
        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            checked={deductions.section80D.parentsSenior}
            onChange={(e) => update80D({ parentsSenior: e.target.checked })}
          />
          <span className="text-sm text-slate-700">
            Parents are senior citizens (60+)
            <span className="block text-xs text-slate-500">
              Raises the 80D cap for your parents&apos; premium from ₹25,000 to ₹50,000.
            </span>
          </span>
        </label>
        <NumberField
          label="80TTA / 80TTB - Savings Interest"
          value={
            isSenior
              ? Math.min(form.otherIncome.savingsInterest + form.otherIncome.otherInterest, 50000)
              : Math.min(form.otherIncome.savingsInterest, 10000)
          }
          onChange={() => undefined}
          disabled
          min={0}
          helpText={
            isSenior
              ? 'Auto-computed (80TTB) from savings + other interest entered above, capped at ₹50,000.'
              : 'Auto-computed (80TTA) from savings interest entered above, capped at ₹10,000.'
          }
        />
        <NumberField
          label="Section 80E - Education Loan Interest"
          value={deductions.section80E}
          onChange={(v) => update({ section80E: v })}
          helpText="No upper cap."
        />
        <NumberField
          label="Section 80G - Donations"
          value={deductions.section80G}
          onChange={(v) => update({ section80G: v })}
          helpText="Enter eligible donation amount."
        />
      </div>
    </section>
  );
}
