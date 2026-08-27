import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { TaxReturnRecord } from '../db/taxReturnRepository';

function formatCurrency(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
}

/** Streams a simple PDF summary of a saved tax return directly to the HTTP response. */
export function streamTaxReturnPdf(res: Response, record: TaxReturnRecord): void {
  const result = JSON.parse(record.result_json);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tax-return-${record.id}.pdf"`,
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text('Tax Break - Tax Calculation Summary', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Assessment Year: ${record.assessment_year}`);
  doc.text(`Generated: ${new Date(record.created_at).toLocaleString('en-IN')}`);
  if (record.label) doc.text(`Label: ${record.label}`);
  doc.moveDown();

  if (result.old && result.new) {
    for (const regime of ['old', 'new'] as const) {
      const breakdown = result[regime];
      doc.fontSize(14).text(`${regime === 'old' ? 'Old Regime' : 'New Regime'}`, { underline: true });
      doc.fontSize(10);
      doc.text(`Gross Total Income: ${formatCurrency(breakdown.grossTotalIncome)}`);
      doc.text(`Total Deductions: ${formatCurrency(breakdown.totalDeductions)}`);
      doc.text(`Taxable Income: ${formatCurrency(breakdown.taxableIncome)}`);
      doc.text(`Total Tax Liability: ${formatCurrency(breakdown.totalTaxLiability)}`);
      doc.text(`Effective Tax Rate: ${breakdown.effectiveTaxRate.toFixed(2)}%`);
      doc.moveDown();
    }
    doc
      .fontSize(12)
      .text(
        `Recommended Regime: ${result.recommendedRegime === 'old' ? 'Old' : 'New'} (saves ${formatCurrency(
          result.savings,
        )})`,
        { underline: true },
      );
  } else {
    doc.fontSize(10).text(JSON.stringify(result, null, 2));
  }

  doc.moveDown(2);
  doc
    .fontSize(8)
    .fillColor('gray')
    .text(
      'Disclaimer: This is an informational estimate only, not a substitute for professional ' +
        'tax advice or the official Income Tax Department e-filing portal.',
    );

  doc.end();
}

/** Streams an Excel workbook summary of a saved tax return directly to the HTTP response. */
export async function streamTaxReturnExcel(res: Response, record: TaxReturnRecord): Promise<void> {
  const result = JSON.parse(record.result_json);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tax Break';
  const sheet = workbook.addWorksheet('Summary');

  sheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Old Regime', key: 'old', width: 20 },
    { header: 'New Regime', key: 'new', width: 20 },
  ];

  if (result.old && result.new) {
    const rows: Array<[string, keyof typeof result.old]> = [
      ['Gross Total Income', 'grossTotalIncome'],
      ['Total Deductions', 'totalDeductions'],
      ['Taxable Income', 'taxableIncome'],
      ['Tax Before Rebate', 'taxBeforeRebate'],
      ['Rebate (87A)', 'rebate'],
      ['Surcharge', 'surcharge'],
      ['Cess', 'cess'],
      ['Total Tax Liability', 'totalTaxLiability'],
    ];
    for (const [label, key] of rows) {
      sheet.addRow({ field: label, old: result.old[key], new: result.new[key] });
    }
    sheet.addRow({});
    sheet.addRow({ field: 'Recommended Regime', old: result.recommendedRegime });
    sheet.addRow({ field: 'Savings', old: result.savings });
  } else {
    sheet.addRow({ field: 'Result', old: JSON.stringify(result) });
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="tax-return-${record.id}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}
