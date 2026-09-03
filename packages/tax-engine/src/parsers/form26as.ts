/**
 * Parser for the text export of Form 26AS (the annual tax statement issued by
 * TRACES). The downloaded file is a delimited text file where every TDS/TCS
 * detail row carries the section code under which tax was deducted, the amount
 * paid/credited and the tax deducted. Columns are separated by `^` in the
 * TRACES export, but tab, pipe and comma separated exports are also accepted.
 *
 * The parser is deliberately tolerant: it looks at every line, keeps the ones
 * that contain a recognisable section code followed by amounts, and aggregates
 * them per section. Challan rows (Part C - advance tax / self assessment tax)
 * are picked up from lines mentioning "Advance Tax" or "Self Assessment Tax".
 */

export interface Form26ASSectionTotal {
  /** TDS/TCS section code as printed in the statement, e.g. "192", "194A". */
  section: string;
  /** Total amount paid or credited under that section. */
  amountPaid: number;
  /** Total tax deducted under that section. */
  taxDeducted: number;
}

export interface Form26ASSummary {
  /** Salary credited by employers (section 192). */
  salaryIncome: number;
  /** Interest income (sections 193, 194A). */
  interestIncome: number;
  /** Dividend income (sections 194, 194K). */
  dividendIncome: number;
  /** Contract, commission, professional and other income (194C/194H/194J/194O...). */
  otherIncome: number;
  /** Advance tax and self assessment tax paid through challans (Part C). */
  advanceAndSelfAssessmentTax: number;
  /** TDS/TCS plus challan payments, i.e. total tax already paid for the year. */
  totalTaxPaid: number;
  /** Per-section totals in the order they were first seen. */
  sections: Form26ASSectionTotal[];
}

const SALARY_SECTIONS = new Set(['192', '192A']);
const INTEREST_SECTIONS = new Set(['193', '194A']);
const DIVIDEND_SECTIONS = new Set(['194', '194K']);
/**
 * Sections whose "amount paid" is not income of the taxpayer, such as a property
 * sale price (194IA), rent paid by the taxpayer (194IB) or a cash withdrawal
 * (194N). Their TDS still counts towards the tax already paid.
 */
const NON_INCOME_SECTIONS = new Set(['194IA', '194IB', '194N', '206C', '206CB', '206CQ', '206CR']);

const SECTION_CODE = /^19[0-9]-?[A-Z]{0,2}$|^206C[A-Z]?$/;
const AMOUNT = /^-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?$|^-?\d+(?:\.\d+)?$/;
/** A date such as 30-Apr-2024 or 30/04/2024 must never be read as an amount. */
const DATE_LIKE = /[a-zA-Z/]/;

function splitRow(line: string): string[] {
  const delimiter = line.includes('^')
    ? '^'
    : line.includes('\t')
      ? '\t'
      : line.includes('|')
        ? '|'
        : ',';
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function toAmount(cell: string): number | undefined {
  if (!cell || DATE_LIKE.test(cell) || !AMOUNT.test(cell)) return undefined;
  const parsed = Number(cell.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function addSection(
  totals: Map<string, Form26ASSectionTotal>,
  section: string,
  amountPaid: number,
  taxDeducted: number,
): void {
  const key = section.replace(/-/g, '').toUpperCase();
  const existing = totals.get(key);
  if (existing) {
    existing.amountPaid += amountPaid;
    existing.taxDeducted += taxDeducted;
    return;
  }
  totals.set(key, { section: key, amountPaid, taxDeducted });
}

/**
 * Parses the contents of a Form 26AS text/CSV export into per-section totals
 * that can be used to pre-fill a tax return. Unrecognised lines are ignored, so
 * headers, footers and page breaks in the export are harmless.
 */
export function parseForm26AS(contents: string): Form26ASSummary {
  const totals = new Map<string, Form26ASSectionTotal>();
  let advanceAndSelfAssessmentTax = 0;

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const cells = splitRow(line);
    const sectionIndex = cells.findIndex((cell) => SECTION_CODE.test(cell.toUpperCase()));

    if (sectionIndex >= 0) {
      const amounts: number[] = [];
      for (const cell of cells.slice(sectionIndex + 1)) {
        const amount = toAmount(cell);
        if (amount !== undefined) amounts.push(amount);
      }
      if (amounts.length >= 2) {
        addSection(totals, cells[sectionIndex], amounts[0], amounts[1]);
      }
      continue;
    }

    if (/advance\s*tax|self\s*assessment\s*tax/i.test(line)) {
      const amounts: number[] = [];
      for (const cell of cells) {
        const amount = toAmount(cell);
        if (amount !== undefined) amounts.push(amount);
      }
      // The last amount on a challan row is the total tax deposited.
      if (amounts.length > 0) advanceAndSelfAssessmentTax += amounts[amounts.length - 1];
    }
  }

  const sections = [...totals.values()];
  const summary: Form26ASSummary = {
    salaryIncome: 0,
    interestIncome: 0,
    dividendIncome: 0,
    otherIncome: 0,
    advanceAndSelfAssessmentTax,
    totalTaxPaid: advanceAndSelfAssessmentTax,
    sections,
  };

  for (const entry of sections) {
    summary.totalTaxPaid += entry.taxDeducted;
    if (SALARY_SECTIONS.has(entry.section)) {
      summary.salaryIncome += entry.amountPaid;
    } else if (INTEREST_SECTIONS.has(entry.section)) {
      summary.interestIncome += entry.amountPaid;
    } else if (DIVIDEND_SECTIONS.has(entry.section)) {
      summary.dividendIncome += entry.amountPaid;
    } else if (!NON_INCOME_SECTIONS.has(entry.section) && !entry.section.startsWith('206C')) {
      summary.otherIncome += entry.amountPaid;
    }
  }

  return summary;
}
