import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InternationalTaxResult, RegimeComparisonResult, TaxCalculationInput } from '@tax-break/tax-engine';
import { AdvanceTaxAndItrSection } from './AdvanceTaxAndItrSection';
import { SaveExportActions } from './SaveExportActions';

interface Props {
  result: RegimeComparisonResult | InternationalTaxResult;
  input?: TaxCalculationInput;
  onBack: () => void;
  onRequireLogin?: () => void;
}

function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ResultsView({ result, input, onBack, onRequireLogin }: Props) {
  if ('country' in result) {
    return <InternationalResultsView result={result} onBack={onBack} />;
  }
  const { old: oldRegime, new: newRegime, recommendedRegime, savings } = result;
  const recommended = recommendedRegime === 'old' ? oldRegime : newRegime;

  const chartData = [
    {
      name: 'Old Regime',
      'Total Tax': Math.round(oldRegime.totalTaxLiability),
    },
    {
      name: 'New Regime',
      'Total Tax': Math.round(newRegime.totalTaxLiability),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm font-medium text-indigo-600 hover:underline"
      >
        ← Back to form
      </button>

      <div className="rounded-lg bg-emerald-50 p-4 text-center">
        <p className="text-sm font-medium text-emerald-800">Recommended Regime</p>
        <p className="text-2xl font-bold capitalize text-emerald-900">{recommendedRegime} Regime</p>
        <p className="text-sm text-emerald-700">
          You save {formatCurrency(savings)} compared to the other regime.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <RegimeCard title="Old Regime" data={oldRegime} highlighted={recommendedRegime === 'old'} />
        <RegimeCard title="New Regime" data={newRegime} highlighted={recommendedRegime === 'new'} />
      </div>

      <div className="mt-10 h-72 w-full">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Comparison Chart</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
            <Legend />
            <Bar dataKey="Total Tax" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-10 overflow-x-auto">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Detailed Breakdown</h3>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-4 text-left font-semibold text-slate-700">Particulars</th>
              <th className="py-2 pr-4 text-right font-semibold text-slate-700">Old Regime</th>
              <th className="py-2 text-right font-semibold text-slate-700">New Regime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <Row
              label="Gross Total Income"
              old={oldRegime.grossTotalIncome}
              newR={newRegime.grossTotalIncome}
            />
            <Row
              label="Total Deductions"
              old={oldRegime.totalDeductions}
              newR={newRegime.totalDeductions}
            />
            <Row
              label="Taxable Income"
              old={oldRegime.taxableIncome}
              newR={newRegime.taxableIncome}
            />
            <Row
              label="Tax Before Rebate"
              old={oldRegime.taxBeforeRebate}
              newR={newRegime.taxBeforeRebate}
            />
            <Row label="Rebate (Sec 87A)" old={oldRegime.rebate} newR={newRegime.rebate} />
            <Row
              label="Tax After Rebate"
              old={oldRegime.taxAfterRebate}
              newR={newRegime.taxAfterRebate}
            />
            <Row label="Surcharge" old={oldRegime.surcharge} newR={newRegime.surcharge} />
            <Row
              label="Capital Gains Tax"
              old={oldRegime.capitalGains.totalCapitalGainsTax}
              newR={newRegime.capitalGains.totalCapitalGainsTax}
            />
            <Row label="Health & Education Cess (4%)" old={oldRegime.cess} newR={newRegime.cess} />
            <tr className="font-semibold">
              <td className="py-2 pr-4">Total Tax Liability</td>
              <td className="py-2 pr-4 text-right">
                {formatCurrency(oldRegime.totalTaxLiability)}
              </td>
              <td className="py-2 text-right">{formatCurrency(newRegime.totalTaxLiability)}</td>
            </tr>
            <Row
              label="Effective Tax Rate"
              old={oldRegime.effectiveTaxRate}
              newR={newRegime.effectiveTaxRate}
              suffix="%"
            />
          </tbody>
        </table>
      </div>

      {input && (
        <AdvanceTaxAndItrSection
          assessmentYear={input.assessmentYear}
          totalTaxLiability={recommended.totalTaxLiability}
          taxAlreadyPaid={input.taxAlreadyPaid ?? 0}
          hasCapitalGains={recommended.capitalGains.totalCapitalGainsIncome > 0}
          hasHouseProperty={Boolean(input.houseProperty)}
          totalIncome={recommended.grossTotalIncome}
        />
      )}

      {input && onRequireLogin && (
        <SaveExportActions input={input} result={result} onRequireLogin={onRequireLogin} />
      )}

      <p className="mt-10 text-xs text-slate-400">
        This calculation is for informational and estimation purposes only. It is not a substitute
        for professional tax advice or official e-filing.
      </p>
    </div>

  );
}

function InternationalResultsView({
  result,
  onBack,
}: {
  result: InternationalTaxResult;
  onBack: () => void;
}) {
  const countryNames: Record<InternationalTaxResult['country'], string> = {
    ireland: 'Ireland',
    netherlands: 'Netherlands',
    uk: 'United Kingdom',
    us: 'United States',
    singapore: 'Singapore',
  };
  const country = countryNames[result.country];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm font-medium text-indigo-600 hover:underline"
      >
        ← Back to form
      </button>
      <h1 className="text-2xl font-bold text-slate-900">{country} income tax estimate</h1>
      <dl className="mt-6 divide-y rounded-lg border border-slate-200 bg-white px-5">
        <InternationalRow
          label="Gross annual income"
          value={result.grossIncome}
          currency={result.currency}
        />
        {result.country === 'ireland' ? (
          <>
            <InternationalRow
              label="Employment income (salary, bonus, benefits, shares vested)"
              value={result.ireland.employmentIncome}
              currency={result.currency}
            />
            {result.ireland.shareVestingIncome > 0 && (
              <InternationalRow
                label="of which share awards vested"
                value={result.ireland.shareVestingIncome}
                currency={result.currency}
              />
            )}
            {result.ireland.otherIncome > 0 && (
              <InternationalRow
                label="Other (non-PAYE) income"
                value={result.ireland.otherIncome}
                currency={result.currency}
              />
            )}
            <InternationalRow
              label="Pension contributions relieved"
              value={result.ireland.pensionRelief}
              currency={result.currency}
            />
          </>
        ) : (
          <InternationalRow
            label="Standard deduction"
            value={result.standardDeduction}
            currency={result.currency}
          />
        )}
        <InternationalRow
          label="Taxable income"
          value={result.taxableIncome}
          currency={result.currency}
        />
        {result.country === 'ireland' && (
          <InternationalRow
            label="Standard rate cut-off point (taxed at 20%)"
            value={result.ireland.standardRateCutOff}
            currency={result.currency}
          />
        )}
        {result.country === 'us' ? (
          <>
            <InternationalRow
              label="Estimated federal income tax"
              value={result.incomeTax}
              currency={result.currency}
            />
            {result.stateTax !== undefined && (
              <InternationalRow
                label={`Estimated state income tax (${result.state})`}
                value={result.stateTax}
                currency={result.currency}
              />
            )}
          </>
        ) : result.taxCredits > 0 ? (
          <>
            <InternationalRow
              label="Income tax before credits"
              value={result.incomeTax}
              currency={result.currency}
            />
            <InternationalRow
              label="Tax credits"
              value={result.taxCredits}
              currency={result.currency}
            />
          </>
        ) : null}
        {result.country === 'ireland' && (
          <>
            <InternationalRow
              label="Universal Social Charge (USC)"
              value={result.ireland.universalSocialCharge}
              currency={result.currency}
            />
            <InternationalRow
              label="Employee PRSI"
              value={result.ireland.prsi}
              currency={result.currency}
            />
            {(result.ireland.capitalGain !== 0 || result.ireland.capitalGainsTax > 0) && (
              <>
                <InternationalRow
                  label="Chargeable gain on shares sold"
                  value={result.ireland.capitalGain}
                  currency={result.currency}
                />
                <InternationalRow
                  label="Gain after the €1,270 annual exemption"
                  value={result.ireland.taxableCapitalGain}
                  currency={result.currency}
                />
                <InternationalRow
                  label="Capital gains tax (33%)"
                  value={result.ireland.capitalGainsTax}
                  currency={result.currency}
                />
              </>
            )}
          </>
        )}
        <InternationalRow
          label={
            result.country === 'us' || result.country === 'ireland'
              ? 'Total estimated tax'
              : 'Estimated income tax'
          }
          value={result.totalTaxLiability}
          currency={result.currency}
          strong
        />
        {result.country === 'ireland' && (
          <InternationalRow
            label="Net income after tax"
            value={result.ireland.netIncome}
            currency={result.currency}
          />
        )}
        <InternationalRow label="Effective tax rate" value={result.effectiveTaxRate} suffix="%" />
      </dl>
      <p className="mt-8 text-xs text-slate-400">
        This resident-individual estimate excludes most additional payroll/social-security
        contributions, local taxes, and other country-specific reliefs. It only applies tax credits
        where they are shown above.
        {result.country === 'ireland' &&
          ' Irish figures use the 2025 bands, credits, USC rates and the 4.1% Class A employee' +
            ' PRSI rate, and assume you are under 70 with no medical card. The PRSI tapered' +
            ' credit for low weekly earnings and the reduced USC rates for medical card holders' +
            ' are not applied.'}
        {result.country === 'us' &&
          ' US figures assume a single filer; city and county income taxes are not included.'}
        {result.country === 'netherlands' &&
          ' The Netherlands has no provincial or municipal income tax; Box 1 rates for taxpayers' +
            ' below the AOW age are used, including the general and labour tax credits.'}{' '}
        Confirm your return with the official filing service or a qualified professional.
      </p>
    </div>
  );
}

function InternationalRow({
  label,
  value,
  currency,
  suffix,
  strong = false,
}: {
  label: string;
  value: number;
  currency?: string;
  suffix?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-3 ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
    >
      <dt>{label}</dt>
      <dd>{suffix ? `${value.toFixed(2)}${suffix}` : formatCurrency(value, currency)}</dd>
    </div>
  );
}

function Row({
  label,
  old,
  newR,
  suffix,
}: {
  label: string;
  old: number;
  newR: number;
  suffix?: string;
}) {
  const format = (v: number) => (suffix ? `${v.toFixed(2)}${suffix}` : formatCurrency(v));
  return (
    <tr>
      <td className="py-2 pr-4 text-slate-600">{label}</td>
      <td className="py-2 pr-4 text-right text-slate-800">{format(old)}</td>
      <td className="py-2 text-right text-slate-800">{format(newR)}</td>
    </tr>
  );
}

function RegimeCard({
  title,
  data,
  highlighted,
}: {
  title: string;
  data: RegimeComparisonResult['old'];
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        highlighted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {formatCurrency(data.totalTaxLiability)}
      </p>
      <p className="text-xs text-slate-500">Effective rate: {data.effectiveTaxRate.toFixed(2)}%</p>
    </div>
  );
}
