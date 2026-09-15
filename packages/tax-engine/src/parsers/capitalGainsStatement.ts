/**
 * Parser for the capital gains / realised profit-and-loss statements that brokers hand out at the
 * end of the year:
 *
 * - India: the "tradewise" capital gains CSV exported by Zerodha Console, ICICI Direct, HDFC
 *   Securities and similar brokers, with one row per closed position (symbol, ISIN, buy and sell
 *   dates and values, realised P&L).
 * - United States: the consolidated Form 1099-B CSV exported by brokers such as Fidelity,
 *   Schwab and Robinhood, with one row per disposal (description, date acquired, date sold,
 *   proceeds, cost basis, short/long term).
 *
 * The statements are plain CSV files, so they are parsed in the browser and never leave the
 * user's device, exactly like the Form 26AS import. The parser is header-driven and tolerant:
 * any preamble rows before the header are skipped and unrecognised columns are ignored.
 */

export type CapitalGainsStatementFormat = 'india-broker' | 'us-1099b';

/** Whether a disposal is taxed as a short-term or long-term capital gain. */
export type CapitalGainsTerm = 'short' | 'long';

/** Whether the asset sold is listed equity (Sections 111A/112A) or any other capital asset. */
export type CapitalGainsAssetClass = 'equity' | 'other';

export interface CapitalGainsTrade {
  /** Symbol or security description as printed in the statement. */
  security: string;
  quantity?: number;
  /** Purchase date in ISO (YYYY-MM-DD) form, when the statement provides one. */
  buyDate?: string;
  /** Sale date in ISO (YYYY-MM-DD) form, when the statement provides one. */
  sellDate?: string;
  /** Sale proceeds, net of charges when the statement reports them net. */
  proceeds: number;
  /** Purchase cost (base cost plus acquisition charges) of the units sold. */
  cost: number;
  /** Realised gain (negative for a loss). */
  gain: number;
  term: CapitalGainsTerm;
  assetClass: CapitalGainsAssetClass;
}

/** Realised gains bucketed the way the Indian capital gains form fields expect them. */
export interface IndiaCapitalGainsTotals {
  /** Section 111A - STCG on listed equity and equity-oriented mutual funds. */
  equitySTCG: number;
  /** Section 112A - LTCG on listed equity and equity-oriented mutual funds. */
  equityLTCG: number;
  /** STCG on other assets (debt funds, unlisted shares, property). */
  otherSTCG: number;
  /** Section 112 - LTCG on other assets. */
  otherLTCG: number;
}

/** Realised gains bucketed the way the US capital gains fields expect them. */
export interface UsCapitalGainsTotals {
  shortTermGains: number;
  longTermGains: number;
}

export interface CapitalGainsStatementSummary {
  format: CapitalGainsStatementFormat;
  /** Currency the amounts are denominated in, inferred from the statement format. */
  currency: 'INR' | 'USD';
  trades: CapitalGainsTrade[];
  india: IndiaCapitalGainsTotals;
  us: UsCapitalGainsTotals;
  /** Rows that could not be read, or assumptions the parser had to make. */
  warnings: string[];
}

export class CapitalGainsStatementError extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Listed equity and equity mutual funds become long-term after 12 months in India and the US. */
const EQUITY_LONG_TERM_DAYS = 365;
/** Other Indian capital assets (property, unlisted shares) become long-term after 24 months. */
const OTHER_LONG_TERM_DAYS = 730;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function splitCsvLine(line: string): string[] {
  const delimiter = line.includes('\t') ? '\t' : line.includes(';') && !line.includes(',') ? ';' : ',';
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
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

function normaliseHeader(cell: string): string {
  return cell.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toNumber(cell: string | undefined): number | undefined {
  if (cell === undefined) return undefined;
  const cleaned = cell.replace(/[₹$,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (!cleaned || !/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(cleaned)) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parses the date formats brokers use. Indian statements write day first (15-04-2024,
 * 15-Apr-2024); US statements write month first (04/15/2024). ISO dates are accepted from both.
 */
function toIsoDate(cell: string | undefined, dayFirst: boolean): string | undefined {
  if (!cell) return undefined;
  const value = cell.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const named = /^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})$/.exec(value);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (!month) return undefined;
    return format(Number(named[1]), month, Number(named[3]));
  }

  const numeric = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(value);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    // A value above 12 can only be the day, whichever convention the broker used.
    const day = dayFirst || first > 12 ? first : second;
    const month = dayFirst || first > 12 ? second : first;
    if (month < 1 || month > 12) return undefined;
    return format(day, month, Number(numeric[3]));
  }
  return undefined;

  function format(day: number, month: number, year: number): string | undefined {
    const fullYear = year < 100 ? 2000 + year : year;
    if (day < 1 || day > 31) return undefined;
    return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}

function holdingDays(buyDate: string | undefined, sellDate: string | undefined): number | undefined {
  if (!buyDate || !sellDate) return undefined;
  const from = Date.parse(`${buyDate}T00:00:00Z`);
  const to = Date.parse(`${sellDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return undefined;
  return Math.round((to - from) / DAY_MS);
}

interface ColumnMap {
  security?: number;
  quantity?: number;
  buyDate?: number;
  sellDate?: number;
  proceeds?: number;
  cost?: number;
  gain?: number;
  term?: number;
  assetType?: number;
}

const COLUMN_PATTERNS: Array<[keyof ColumnMap, RegExp]> = [
  ['security', /^(symbol|scrip|security|stock name|description|name of (the )?(security|share|fund)|instrument)$/],
  ['quantity', /^(quantity|qty|quantity sold|units|shares|no of shares)$/],
  ['buyDate', /(buy|purchase|acquisition|acquired|entry).*(date)|^date (acquired|of (purchase|acquisition))$/],
  ['sellDate', /(sell|sale|sold|disposal|exit).*(date)|^date (sold|of (sale|disposal))$/],
  ['proceeds', /^(sell value|sale value|sale consideration|sales? proceeds|proceeds|gross proceeds|total proceeds|sale amount)$/],
  ['cost', /^(buy value|purchase value|cost|cost basis|cost or other basis|acquisition cost|total cost|buy amount)$/],
  ['gain', /(realized|realised).*(p l|profit|gain)|^(profit|gain|gain loss|net gain|capital gain)$/],
  ['term', /^(term|type|gain type|holding period|period of holding|short long|term of gain)$/],
  ['assetType', /^(asset type|instrument type|security type|segment|category|asset class)$/],
];

function mapColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  headers.forEach((header, index) => {
    for (const [field, pattern] of COLUMN_PATTERNS) {
      if (map[field] === undefined && pattern.test(header)) {
        map[field] = index;
        return;
      }
    }
  });
  return map;
}

function detectFormat(headers: string[]): CapitalGainsStatementFormat {
  const joined = headers.join('|');
  if (/cost or other basis|\bproceeds\b|date acquired|date sold|wash sale/.test(joined)) {
    return 'us-1099b';
  }
  return 'india-broker';
}

function cell(row: string[], index: number | undefined): string | undefined {
  return index === undefined ? undefined : row[index];
}

function classifyTerm(
  row: string[],
  columns: ColumnMap,
  buyDate: string | undefined,
  sellDate: string | undefined,
  assetClass: CapitalGainsAssetClass,
): CapitalGainsTerm | undefined {
  const declared = cell(row, columns.term)?.toLowerCase() ?? '';
  if (/\blong\b|ltcg|^l$/.test(declared)) return 'long';
  if (/\bshort\b|stcg|^s$/.test(declared)) return 'short';

  const days = holdingDays(buyDate, sellDate);
  if (days === undefined) return undefined;
  const threshold = assetClass === 'equity' ? EQUITY_LONG_TERM_DAYS : OTHER_LONG_TERM_DAYS;
  return days > threshold ? 'long' : 'short';
}

function classifyAsset(row: string[], columns: ColumnMap): CapitalGainsAssetClass {
  const declared = `${cell(row, columns.assetType) ?? ''} ${cell(row, columns.security) ?? ''}`.toLowerCase();
  if (/debt|bond|gilt|liquid|gold|property|land|unlisted|reit|invit/.test(declared)) return 'other';
  return 'equity';
}

/**
 * Parses a broker capital gains statement (Indian tradewise CSV or US Form 1099-B CSV) into
 * realised gain totals that can pre-fill the capital gains fields of the tax form.
 *
 * @throws {CapitalGainsStatementError} when no recognisable header row is present.
 */
export function parseCapitalGainsStatement(contents: string): CapitalGainsStatementSummary {
  const lines = contents.split(/\r?\n/).filter((line) => line.trim().length > 0);

  let columns: ColumnMap | undefined;
  let headerIndex = -1;
  let format: CapitalGainsStatementFormat = 'india-broker';

  for (let i = 0; i < lines.length; i += 1) {
    const headers = splitCsvLine(lines[i]).map(normaliseHeader);
    const candidate = mapColumns(headers);
    const hasAmounts =
      (candidate.proceeds !== undefined && candidate.cost !== undefined) ||
      candidate.gain !== undefined;
    if (candidate.security !== undefined && hasAmounts) {
      columns = candidate;
      headerIndex = i;
      format = detectFormat(headers);
      break;
    }
  }

  if (!columns) {
    throw new CapitalGainsStatementError(
      'No capital gains rows were found. Export the tradewise capital gains statement (CSV) from ' +
        'your broker, or the consolidated Form 1099-B CSV, and upload that file.',
    );
  }

  const dayFirst = format === 'india-broker';
  const trades: CapitalGainsTrade[] = [];
  const warnings: string[] = [];
  let assumedShortTerm = 0;

  for (const line of lines.slice(headerIndex + 1)) {
    const row = splitCsvLine(line);
    const security = cell(row, columns.security)?.replace(/^"|"$/g, '') ?? '';
    if (!security || /^(total|grand total|subtotal)\b/i.test(security)) continue;

    const proceeds = toNumber(cell(row, columns.proceeds));
    const cost = toNumber(cell(row, columns.cost));
    const declaredGain = toNumber(cell(row, columns.gain));
    if (proceeds === undefined && cost === undefined && declaredGain === undefined) continue;

    const gain =
      declaredGain !== undefined
        ? declaredGain
        : proceeds !== undefined && cost !== undefined
          ? proceeds - cost
          : undefined;
    if (gain === undefined) {
      warnings.push(`Skipped "${security}": the row has no realised gain or proceeds and cost.`);
      continue;
    }

    const buyDate = toIsoDate(cell(row, columns.buyDate), dayFirst);
    const sellDate = toIsoDate(cell(row, columns.sellDate), dayFirst);
    const assetClass = classifyAsset(row, columns);
    const term = classifyTerm(row, columns, buyDate, sellDate, assetClass);
    if (term === undefined) assumedShortTerm += 1;

    trades.push({
      security,
      quantity: toNumber(cell(row, columns.quantity)),
      buyDate,
      sellDate,
      proceeds: proceeds ?? 0,
      cost: cost ?? (proceeds !== undefined ? proceeds - gain : 0),
      gain,
      term: term ?? 'short',
      assetClass,
    });
  }

  if (assumedShortTerm > 0) {
    warnings.push(
      `${assumedShortTerm} row${assumedShortTerm === 1 ? '' : 's'} had no holding period or term ` +
        'column, so the gain was treated as short-term. Check those amounts before filing.',
    );
  }

  const india: IndiaCapitalGainsTotals = {
    equitySTCG: 0,
    equityLTCG: 0,
    otherSTCG: 0,
    otherLTCG: 0,
  };
  const us: UsCapitalGainsTotals = { shortTermGains: 0, longTermGains: 0 };

  for (const trade of trades) {
    if (trade.assetClass === 'equity') {
      if (trade.term === 'long') india.equityLTCG += trade.gain;
      else india.equitySTCG += trade.gain;
    } else if (trade.term === 'long') {
      india.otherLTCG += trade.gain;
    } else {
      india.otherSTCG += trade.gain;
    }

    if (trade.term === 'long') us.longTermGains += trade.gain;
    else us.shortTermGains += trade.gain;
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  india.equitySTCG = round(india.equitySTCG);
  india.equityLTCG = round(india.equityLTCG);
  india.otherSTCG = round(india.otherSTCG);
  india.otherLTCG = round(india.otherLTCG);
  us.shortTermGains = round(us.shortTermGains);
  us.longTermGains = round(us.longTermGains);

  return { format, currency: format === 'us-1099b' ? 'USD' : 'INR', trades, india, us, warnings };
}
