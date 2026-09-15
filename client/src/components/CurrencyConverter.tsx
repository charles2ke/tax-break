import { useEffect, useState } from 'react';
import { getFxRates } from '../api';
import type { FxRateSnapshot } from '../api';

interface Props {
  /** Amount to convert, in `currency`. */
  amount: number;
  currency: string;
  label: string;
}

const PREFERRED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY'];

/** Converts `amount` from `from` to `to` using rates quoted against the snapshot base. */
export function convertWithSnapshot(
  snapshot: FxRateSnapshot,
  amount: number,
  from: string,
  to: string,
): number | undefined {
  const rate = (code: string) => (code === snapshot.base ? 1 : snapshot.rates[code]);
  const fromRate = rate(from);
  const toRate = rate(to);
  if (!fromRate || !toRate) return undefined;
  return (amount / fromRate) * toRate;
}

/**
 * Shows a tax total in a second currency using the daily reference rates served by the API. The
 * whole block is hidden when no rates are available (for example on the static demo deployment).
 */
export function CurrencyConverter({ amount, currency, label }: Props) {
  const [snapshot, setSnapshot] = useState<FxRateSnapshot | undefined>();
  const [target, setTarget] = useState('INR');

  useEffect(() => {
    let cancelled = false;
    void getFxRates().then((rates) => {
      if (!cancelled) setSnapshot(rates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snapshot) return null;

  const available = PREFERRED_CURRENCIES.filter(
    (code) => code !== currency && (code === snapshot.base || snapshot.rates[code] !== undefined),
  );
  if (available.length === 0) return null;

  const selected = available.includes(target) ? target : available[0];
  const converted = convertWithSnapshot(snapshot, amount, currency, selected);
  if (converted === undefined) return null;

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-700">{label} in</span>
        <select
          value={selected}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm"
        >
          {available.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <span className="font-semibold text-slate-900">
          {new Intl.NumberFormat(selected === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: selected,
            maximumFractionDigits: 0,
          }).format(converted)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {snapshot.source === 'static'
          ? 'Indicative rates from a built-in fallback table'
          : `European Central Bank reference rates for ${snapshot.date}`}
        . Converted for comparison only — your tax is always payable in {currency}.
      </p>
    </div>
  );
}
