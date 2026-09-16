/**
 * Foreign exchange rates for the multi-country estimates.
 *
 * The rates come from the European Central Bank's daily reference feed, which is public, free and
 * needs no credentials. Because the feed publishes once per working day, a fetched snapshot is
 * cached in SQLite and reused for the rest of the day; if the feed cannot be reached (offline
 * development, CI, or an ECB outage) the service falls back to the last cached snapshot and
 * finally to a small static table, so the API always answers.
 */

import { getDb } from '../db';
import { httpRequestText } from './http';

/** Currencies used by the countries the calculator supports. */
export const SUPPORTED_CURRENCIES = ['EUR', 'INR', 'GBP', 'USD', 'SGD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface FxRateSnapshot {
  /** Currency the rates are quoted against. Always `EUR` internally. */
  base: 'EUR';
  /** Date of the ECB reference rates, in ISO (YYYY-MM-DD) form. */
  date: string;
  /** Units of each currency per 1 unit of the base currency. */
  rates: Record<string, number>;
  /** Where the snapshot came from: the live feed, the local cache, or the static fallback. */
  source: 'ecb' | 'cache' | 'static';
}

export interface FxRatesProvider {
  readonly name: string;
  getRates(): Promise<FxRateSnapshot>;
}

const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

/**
 * Indicative rates used only when neither the ECB feed nor a cached snapshot is available. They
 * are clearly labelled as `static` in the API response so the UI can warn that they are stale.
 */
const STATIC_RATES: Record<string, number> = {
  EUR: 1,
  INR: 95.5,
  GBP: 0.85,
  USD: 1.08,
  SGD: 1.45,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function cacheRates(snapshot: FxRateSnapshot): void {
  getDb()
    .prepare(
      `INSERT INTO fx_rates (rate_date, base_currency, rates_json, fetched_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(rate_date, base_currency)
       DO UPDATE SET rates_json = excluded.rates_json, fetched_at = excluded.fetched_at`,
    )
    .run(snapshot.date, snapshot.base, JSON.stringify(snapshot.rates));
}

function readCachedRates(maxAgeDays = 7): FxRateSnapshot | undefined {
  const row = getDb()
    .prepare(
      `SELECT rate_date, base_currency, rates_json FROM fx_rates
       WHERE base_currency = 'EUR' AND rate_date >= date('now', ?)
       ORDER BY rate_date DESC LIMIT 1`,
    )
    .get(`-${maxAgeDays} days`) as
    | { rate_date: string; base_currency: string; rates_json: string }
    | undefined;
  if (!row) return undefined;
  return {
    base: 'EUR',
    date: row.rate_date,
    rates: JSON.parse(row.rates_json) as Record<string, number>,
    source: 'cache',
  };
}

/** Extracts the currency/rate pairs and the quotation date from the ECB daily XML feed. */
export function parseEcbDailyXml(xml: string): { date: string; rates: Record<string, number> } {
  const dateMatch = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml);
  const rates: Record<string, number> = { EUR: 1 };
  const pattern = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
  let match = pattern.exec(xml);
  while (match) {
    const rate = Number(match[2]);
    if (Number.isFinite(rate) && rate > 0) rates[match[1]] = rate;
    match = pattern.exec(xml);
  }
  if (Object.keys(rates).length <= 1 || !dateMatch) {
    throw new Error('The exchange rate feed did not contain any rates.');
  }
  return { date: dateMatch[1], rates };
}

/** Rates from the live ECB feed, cached in SQLite for the rest of the publication day. */
export class EcbFxRatesProvider implements FxRatesProvider {
  readonly name = 'ecb';

  async getRates(): Promise<FxRateSnapshot> {
    const cached = readCachedRates(1);
    if (cached && cached.date === today()) return cached;

    try {
      const xml = await httpRequestText(process.env.FX_RATES_URL ?? ECB_DAILY_URL, {
        headers: { Accept: 'application/xml' },
        label: 'ecb exchange rate feed',
      });
      const { date, rates } = parseEcbDailyXml(xml);
      const snapshot: FxRateSnapshot = { base: 'EUR', date, rates, source: 'ecb' };
      cacheRates(snapshot);
      return snapshot;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `[integrations] exchange rates: live feed unavailable (${(error as Error).message}); ` +
          'falling back to the cached snapshot.',
      );
      return cached ?? readCachedRates() ?? staticSnapshot();
    }
  }
}

function staticSnapshot(): FxRateSnapshot {
  return { base: 'EUR', date: today(), rates: { ...STATIC_RATES }, source: 'static' };
}

/** Offline provider used by default, in tests and in CI: no network calls at all. */
export class StaticFxRatesProvider implements FxRatesProvider {
  readonly name = 'static';

  async getRates(): Promise<FxRateSnapshot> {
    return staticSnapshot();
  }
}

/**
 * Converts an amount between two currencies using a snapshot quoted against a single base.
 *
 * @throws {Error} when either currency is missing from the snapshot.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  snapshot: FxRateSnapshot,
): number {
  const fromRate = snapshot.rates[from];
  const toRate = snapshot.rates[to];
  if (!fromRate || !toRate) {
    throw new Error(`No exchange rate available for ${from} to ${to}.`);
  }
  return (amount / fromRate) * toRate;
}

let cachedProvider: FxRatesProvider | undefined;
let cachedProviderKey: string | undefined;

/**
 * Returns the configured rates provider. `FX_RATES_PROVIDER=ecb` enables the live feed; the
 * default `static` keeps the server fully offline.
 */
export function getFxRatesProvider(): FxRatesProvider {
  const key = process.env.FX_RATES_PROVIDER ?? 'static';
  if (cachedProvider && cachedProviderKey === key) return cachedProvider;
  cachedProvider = key === 'ecb' ? new EcbFxRatesProvider() : new StaticFxRatesProvider();
  cachedProviderKey = key;
  return cachedProvider;
}

/** Test helper: clears the memoised provider so a changed environment is picked up. */
export function resetFxRatesProviderForTests(): void {
  cachedProvider = undefined;
  cachedProviderKey = undefined;
}
