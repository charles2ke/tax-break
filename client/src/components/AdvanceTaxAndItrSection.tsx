import { useEffect, useState } from 'react';
import type { AdvanceTaxResult, AssessmentYear, ItrRecommendation } from '@tax-break/tax-engine';
import { calculateAdvanceTax, getItrRecommendation } from '../api';

interface Props {
  assessmentYear: AssessmentYear;
  totalTaxLiability: number;
  taxAlreadyPaid: number;
  hasCapitalGains: boolean;
  hasHouseProperty: boolean;
  totalIncome: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdvanceTaxAndItrSection({
  assessmentYear,
  totalTaxLiability,
  taxAlreadyPaid,
  hasCapitalGains,
  hasHouseProperty,
  totalIncome,
}: Props) {
  const [advanceTax, setAdvanceTax] = useState<AdvanceTaxResult | undefined>();
  const [itr, setItr] = useState<ItrRecommendation | undefined>();

  useEffect(() => {
    calculateAdvanceTax(totalTaxLiability, taxAlreadyPaid, assessmentYear)
      .then(setAdvanceTax)
      .catch(() => setAdvanceTax(undefined));
    getItrRecommendation({
      hasSalaryIncome: true,
      hasSingleHouseProperty: hasHouseProperty,
      hasCapitalGains,
      totalIncome,
      isResidentIndividual: true,
    })
      .then(setItr)
      .catch(() => setItr(undefined));
  }, [assessmentYear, totalTaxLiability, taxAlreadyPaid, hasCapitalGains, hasHouseProperty, totalIncome]);

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
      {itr && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Recommended ITR Form</h3>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{itr.recommendedForm}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {itr.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {advanceTax && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Advance Tax</h3>
          {advanceTax.advanceTaxApplicable ? (
            <>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-1">Installment</th>
                    <th className="pb-1">Due Date</th>
                    <th className="pb-1 text-right">Cumulative Due</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceTax.installments.map((installment) => (
                    <tr key={installment.label}>
                      <td className="py-0.5">{installment.label}</td>
                      <td className="py-0.5">{installment.dueDate}</td>
                      <td className="py-0.5 text-right">
                        {formatCurrency(installment.cumulativeAmountDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {advanceTax.totalInterest > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Estimated interest (Sec 234B/234C) if unpaid on time:{' '}
                  {formatCurrency(advanceTax.totalInterest)}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-600">
              Net tax payable is below ₹10,000, so advance tax is not required.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
