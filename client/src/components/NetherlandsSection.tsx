import type { NetherlandsTaxCalculationInput } from '@tax-break/tax-engine';
import { NumberField } from './NumberField';

export interface NetherlandsFormState {
  annualIncome: number;
  holidayAllowance: number;
  bonus: number;
  taxableBenefits: number;
  otherIncome: number;
  thirtyPercentRuling: boolean;
  fiscalPartner: boolean;
  pensionContributions: number;
  otherDeductions: number;
  wozValue: number;
  mortgageInterest: number;
  savings: number;
  investments: number;
  debts: number;
  box2Income: number;
}

export const initialNetherlandsFormState: NetherlandsFormState = {
  annualIncome: 0,
  holidayAllowance: 0,
  bonus: 0,
  taxableBenefits: 0,
  otherIncome: 0,
  thirtyPercentRuling: false,
  fiscalPartner: false,
  pensionContributions: 0,
  otherDeductions: 0,
  wozValue: 0,
  mortgageInterest: 0,
  savings: 0,
  investments: 0,
  debts: 0,
  box2Income: 0,
};

export function toNetherlandsTaxCalculationInput(
  form: NetherlandsFormState,
): NetherlandsTaxCalculationInput {
  return {
    country: 'netherlands',
    annualIncome: form.annualIncome,
    holidayAllowance: form.holidayAllowance,
    bonus: form.bonus,
    taxableBenefits: form.taxableBenefits,
    otherIncome: form.otherIncome,
    thirtyPercentRuling: form.thirtyPercentRuling,
    fiscalPartner: form.fiscalPartner,
    pensionContributions: form.pensionContributions,
    otherDeductions: form.otherDeductions,
    home: {
      wozValue: form.wozValue,
      mortgageInterest: form.mortgageInterest,
    },
    box3: {
      savings: form.savings,
      investments: form.investments,
      debts: form.debts,
    },
    box2Income: form.box2Income,
  };
}

export const NETHERLANDS_STEP_TITLES = [
  'Personal situation',
  'Box 1 work income',
  'Home & deductions',
  'Box 2 & Box 3',
];

interface Props {
  form: NetherlandsFormState;
  onChange: (updater: (form: NetherlandsFormState) => NetherlandsFormState) => void;
  /** When set, only the section with this index is rendered (wizard mode). */
  step?: number;
}

export function NetherlandsSection({ form, onChange, step }: Props) {
  const update = (patch: Partial<NetherlandsFormState>) => onChange((f) => ({ ...f, ...patch }));
  const show = (index: number) => step === undefined || step === index;

  return (
    <div className="space-y-10">
      {show(0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">1. Personal Situation</h2>
          <p className="text-xs text-slate-500">
            2025 rates for a resident taxpayer below the AOW (state pension) age. The Netherlands has
            no provincial or municipal income tax.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.thirtyPercentRuling}
              onChange={(e) => update({ thirtyPercentRuling: e.target.checked })}
            />
            <span className="text-sm text-slate-700">
              I have the 30% ruling (30%-regeling)
              <span className="block text-xs text-slate-500">
                Exempts 30% of your employment income from tax, on salary up to the €246,000 norm
                (maximum €73,800 tax free).
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.fiscalPartner}
              onChange={(e) => update({ fiscalPartner: e.target.checked })}
            />
            <span className="text-sm text-slate-700">
              I have a fiscal partner
              <span className="block text-xs text-slate-500">
                Doubles the Box 3 tax-free allowance to €115,368 and the €3,800 debt threshold.
              </span>
            </span>
          </label>
        </section>
      )}

      {show(1) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">2. Box 1 - Work Income</h2>
          <p className="text-xs text-slate-500">
            Everything paid through payroll before tax. The first two Box 1 brackets already include
            national social-security contributions.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Gross annual salary (€)"
              example="€70,000"
              value={form.annualIncome}
              onChange={(v) => update({ annualIncome: v })}
              helpText="Annual salary before tax, excluding holiday allowance, bonus and benefits."
            />
            <NumberField
              label="Holiday allowance (€)"
              example="€5,600"
              value={form.holidayAllowance}
              onChange={(v) => update({ holidayAllowance: v })}
              helpText="Vakantiegeld, normally 8% of your gross salary and paid in May."
            />
            <NumberField
              label="Bonus / 13th month (€)"
              example="€6,000"
              value={form.bonus}
              onChange={(v) => update({ bonus: v })}
              helpText="Bonus, commission or a 13th month paid during the year."
            />
            <NumberField
              label="Taxable benefits (€)"
              example="€4,800"
              value={form.taxableBenefits}
              onChange={(v) => update({ taxableBenefits: v })}
              helpText="Notional pay such as the company car addition (bijtelling)."
            />
            <NumberField
              label="Other Box 1 income (€)"
              example="€3,000"
              value={form.otherIncome}
              onChange={(v) => update({ otherIncome: v })}
              helpText="Freelance profit, alimony received or other income taxed in Box 1."
            />
          </div>
        </section>
      )}

      {show(2) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            3. Owner-Occupied Home & Deductions
          </h2>
          <p className="text-xs text-slate-500">
            Your home adds a notional rental value to your income; mortgage interest is deductible.
            Mortgage interest and personal deductions are only relieved at 37.48% in 2025.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="WOZ value of your home (€)"
              example="€425,000"
              value={form.wozValue}
              onChange={(v) => update({ wozValue: v })}
              helpText="Municipal valuation of your owner-occupied home. Adds 0.35% of the value as eigenwoningforfait (2.35% above €1,330,000)."
            />
            <NumberField
              label="Mortgage interest paid (€)"
              example="€9,600"
              value={form.mortgageInterest}
              onChange={(v) => update({ mortgageInterest: v })}
              helpText="Deductible interest on the loan for your own home during the year."
            />
            <NumberField
              label="Pension contributions (€)"
              example="€3,000"
              value={form.pensionContributions}
              onChange={(v) => update({ pensionContributions: v })}
              helpText="Your own deductible pension or annuity (lijfrente) contributions for the year."
            />
            <NumberField
              label="Other personal deductions (€)"
              example="€1,200"
              value={form.otherDeductions}
              onChange={(v) => update({ otherDeductions: v })}
              helpText="Aftrekposten such as gifts to charity, alimony paid or specific healthcare costs."
            />
          </div>
        </section>
      )}

      {show(3) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">4. Box 2 & Box 3</h2>
          <p className="text-xs text-slate-500">
            Box 2 taxes income from a substantial (5%+) shareholding. Box 3 taxes a deemed return on
            your savings and investments on 1 January at 36%.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Box 2 income (€)"
              example="€25,000"
              value={form.box2Income}
              onChange={(v) => update({ box2Income: v })}
              helpText="Dividends or gains from a substantial interest. Taxed at 24.5% up to €67,804 and 31% above."
            />
            <NumberField
              label="Savings on 1 January (€)"
              example="€30,000"
              value={form.savings}
              onChange={(v) => update({ savings: v })}
              helpText="Bank and savings balances. Deemed return of 1.44% for 2025."
            />
            <NumberField
              label="Investments and other assets (€)"
              example="€50,000"
              value={form.investments}
              onChange={(v) => update({ investments: v })}
              helpText="Shares, bonds, crypto and second properties. Deemed return of 5.88% for 2025."
            />
            <NumberField
              label="Other debts (€)"
              example="€10,000"
              value={form.debts}
              onChange={(v) => update({ debts: v })}
              helpText="Debts other than your home mortgage. Only the amount above €3,800 (€7,600 with a fiscal partner) reduces your Box 3 assets."
            />
          </div>
        </section>
      )}
    </div>
  );
}
