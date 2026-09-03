import type {
  IrelandFilingStatus,
  IrelandPensionAgeBand,
  IrelandTaxCalculationInput,
} from '@tax-break/tax-engine';
import { NumberField } from './NumberField';

export interface IrelandFormState {
  annualIncome: number;
  bonus: number;
  taxableBenefits: number;
  otherIncome: number;
  filingStatus: IrelandFilingStatus;
  spouseIncome: number;
  pensionContributions: number;
  pensionAgeBand: IrelandPensionAgeBand;
  rsuVestedValue: number;
  shareSaleProceeds: number;
  shareSaleCost: number;
  capitalLossesForward: number;
  medicalExpenses: number;
  rentPaid: number;
}

export const initialIrelandFormState: IrelandFormState = {
  annualIncome: 0,
  bonus: 0,
  taxableBenefits: 0,
  otherIncome: 0,
  filingStatus: 'single',
  spouseIncome: 0,
  pensionContributions: 0,
  pensionAgeBand: 'under30',
  rsuVestedValue: 0,
  shareSaleProceeds: 0,
  shareSaleCost: 0,
  capitalLossesForward: 0,
  medicalExpenses: 0,
  rentPaid: 0,
};

const FILING_STATUS_OPTIONS: { value: IrelandFilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'singleParent', label: 'Single person child carer' },
  { value: 'marriedOneIncome', label: 'Married/civil partner - one income' },
  { value: 'marriedTwoIncomes', label: 'Married/civil partner - two incomes' },
];

const PENSION_AGE_BAND_OPTIONS: { value: IrelandPensionAgeBand; label: string }[] = [
  { value: 'under30', label: 'Under 30 (15% limit)' },
  { value: '30to39', label: '30 to 39 (20% limit)' },
  { value: '40to49', label: '40 to 49 (25% limit)' },
  { value: '50to54', label: '50 to 54 (30% limit)' },
  { value: '55to59', label: '55 to 59 (35% limit)' },
  { value: '60plus', label: '60 and over (40% limit)' },
];

export function toIrelandTaxCalculationInput(form: IrelandFormState): IrelandTaxCalculationInput {
  return {
    country: 'ireland',
    annualIncome: form.annualIncome,
    bonus: form.bonus,
    taxableBenefits: form.taxableBenefits,
    otherIncome: form.otherIncome,
    filingStatus: form.filingStatus,
    spouseIncome: form.filingStatus === 'marriedTwoIncomes' ? form.spouseIncome : 0,
    pensionContributions: form.pensionContributions,
    pensionAgeBand: form.pensionAgeBand,
    shares: {
      rsuVestedValue: form.rsuVestedValue,
      shareSaleProceeds: form.shareSaleProceeds,
      shareSaleCost: form.shareSaleCost,
      capitalLossesForward: form.capitalLossesForward,
    },
    medicalExpenses: form.medicalExpenses,
    rentPaid: form.rentPaid,
  };
}

export const IRELAND_STEP_TITLES = [
  'Personal circumstances',
  'Employment income',
  'Share awards',
  'Pension & reliefs',
];

interface Props {
  form: IrelandFormState;
  onChange: (updater: (form: IrelandFormState) => IrelandFormState) => void;
  /** When set, only the section with this index is rendered (wizard mode). */
  step?: number;
}

export function IrelandSection({ form, onChange, step }: Props) {
  const update = (patch: Partial<IrelandFormState>) => onChange((f) => ({ ...f, ...patch }));
  const show = (index: number) => step === undefined || step === index;

  return (
    <div className="space-y-10">
      {show(0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">1. Personal Circumstances</h2>
          <p className="text-xs text-slate-500">
            Your status sets the standard rate cut-off point (the amount taxed at 20%) and your
            personal tax credits for 2025.
          </p>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Personal status</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={form.filingStatus}
              onChange={(e) => update({ filingStatus: e.target.value as IrelandFilingStatus })}
            >
              {FILING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              Single: €44,000 at 20%. Single person child carer: €48,000. Jointly assessed couples:
              €53,000, extended by the lower earner's income up to €88,000.
            </span>
          </label>
          {form.filingStatus === 'marriedTwoIncomes' && (
            <NumberField
              label="Lower earner annual income (€)"
              example="€38,000"
              value={form.spouseIncome}
              onChange={(v) => update({ spouseIncome: v })}
              helpText="Enter the lower earner's income (you or your spouse/civil partner). This extends your standard rate cut-off point by up to €35,000 and adds a second employee tax credit."
            />
          )}
        </section>
      )}

      {show(1) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">2. Employment Income</h2>
          <p className="text-xs text-slate-500">
            Everything paid through payroll during the year, before tax, USC and PRSI.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Gross basic salary (€)"
              example="€65,000"
              value={form.annualIncome}
              onChange={(v) => update({ annualIncome: v })}
              helpText="Annual salary before any deductions, excluding bonus and share income."
            />
            <NumberField
              label="Bonus / commission (€)"
              example="€8,000"
              value={form.bonus}
              onChange={(v) => update({ bonus: v })}
              helpText="Performance bonus, commission or other cash incentives paid in the year. Taxed at your marginal rate with USC and PRSI."
            />
            <NumberField
              label="Benefits in kind (€)"
              example="€1,500"
              value={form.taxableBenefits}
              onChange={(v) => update({ taxableBenefits: v })}
              helpText="Notional pay such as a company car, employer-paid health insurance or preferential loans."
            />
            <NumberField
              label="Other income (€)"
              example="€4,000"
              value={form.otherIncome}
              onChange={(v) => update({ otherIncome: v })}
              helpText="Non-PAYE income such as rental profit, dividends or freelance income assessed in the same year."
            />
          </div>
        </section>
      )}

      {show(2) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">3. Share Awards & Disposals</h2>
          <p className="text-xs text-slate-500">
            RSUs are taxed as pay on vesting; selling the shares later is a separate capital gains
            event at 33%.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Value of shares vested (€)"
              example="€12,000"
              value={form.rsuVestedValue}
              onChange={(v) => update({ rsuVestedValue: v })}
              helpText="Market value on the vesting date of RSUs/share awards that vested this year. Taxed as employment income (income tax, USC and PRSI)."
            />
            <NumberField
              label="Proceeds from shares sold (€)"
              example="€9,000"
              value={form.shareSaleProceeds}
              onChange={(v) => update({ shareSaleProceeds: v })}
              helpText="Total sale proceeds for shares disposed of during the year."
            />
            <NumberField
              label="Cost of shares sold (€)"
              example="€7,500"
              value={form.shareSaleCost}
              onChange={(v) => update({ shareSaleCost: v })}
              helpText="Base cost plus dealing fees. For RSUs this is the value already taxed on vesting."
            />
            <NumberField
              label="Capital losses forward (€)"
              example="€1,000"
              value={form.capitalLossesForward}
              onChange={(v) => update({ capitalLossesForward: v })}
              helpText="Unused allowable losses from earlier years, offset against this year's gains before the €1,270 annual exemption."
            />
          </div>
        </section>
      )}

      {show(3) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">4. Pension & Reliefs</h2>
          <p className="text-xs text-slate-500">
            Pension contributions get income tax relief but no USC or PRSI relief. Other reliefs are
            given as non-refundable tax credits.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Pension / PRSA / AVC contributions (€)"
              example="€6,500"
              value={form.pensionContributions}
              onChange={(v) => update({ pensionContributions: v })}
              helpText="Your own contributions for the year. Relief is limited to an age-related percentage of earnings, capped at €115,000 of earnings."
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Age band</span>
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={form.pensionAgeBand}
                onChange={(e) => update({ pensionAgeBand: e.target.value as IrelandPensionAgeBand })}
              >
                {PENSION_AGE_BAND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Your age at the end of the year, which sets the maximum share of earnings you can
                claim pension relief on.
              </span>
            </label>
            <NumberField
              label="Non-routine medical expenses (€)"
              example="€800"
              value={form.medicalExpenses}
              onChange={(v) => update({ medicalExpenses: v })}
              helpText="Qualifying unreimbursed medical expenses. Relieved at 20% as a tax credit."
            />
            <NumberField
              label="Rent paid on your home (€)"
              example="€14,400"
              value={form.rentPaid}
              onChange={(v) => update({ rentPaid: v })}
              helpText="Private rent for your principal residence. Rent tax credit is 20% of rent, capped at €1,000 (€2,000 jointly assessed)."
            />
          </div>
        </section>
      )}
    </div>
  );
}
