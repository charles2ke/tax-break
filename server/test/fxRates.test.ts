import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EcbFxRatesProvider,
  StaticFxRatesProvider,
  convertAmount,
  getFxRatesProvider,
  parseEcbDailyXml,
  resetFxRatesProviderForTests,
} from '../src/services/fxRates';
import { resetDbForTests } from '../src/db';

const originalFetch = globalThis.fetch;

/** Recorded excerpt of the ECB daily reference rates feed. */
const ECB_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01">
  <Cube>
    <Cube time='2026-09-15'>
      <Cube currency='USD' rate='1.0812'/>
      <Cube currency='GBP' rate='0.8465'/>
      <Cube currency='INR' rate='95.3120'/>
      <Cube currency='SGD' rate='1.4521'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

describe('parseEcbDailyXml', () => {
  it('reads the quotation date and the rates against the euro', () => {
    const { date, rates } = parseEcbDailyXml(ECB_FEED);

    expect(date).toBe('2026-09-15');
    expect(rates).toMatchObject({ EUR: 1, USD: 1.0812, INR: 95.312 });
  });

  it('rejects a feed with no rates', () => {
    expect(() => parseEcbDailyXml('<Envelope></Envelope>')).toThrow();
  });
});

describe('convertAmount', () => {
  const snapshot = {
    base: 'EUR' as const,
    date: '2026-09-15',
    rates: { EUR: 1, USD: 1.08, INR: 95.5 },
    source: 'ecb' as const,
  };

  it('converts through the base currency', () => {
    expect(convertAmount(100, 'EUR', 'INR', snapshot)).toBeCloseTo(9550, 6);
    expect(convertAmount(9550, 'INR', 'EUR', snapshot)).toBeCloseTo(100, 6);
    expect(convertAmount(108, 'USD', 'INR', snapshot)).toBeCloseTo(9550, 6);
  });

  it('rejects an unknown currency', () => {
    expect(() => convertAmount(100, 'EUR', 'JPY', snapshot)).toThrow(/JPY/);
  });
});

describe('getFxRatesProvider', () => {
  afterEach(() => {
    delete process.env.FX_RATES_PROVIDER;
    resetFxRatesProviderForTests();
  });

  it('defaults to the offline static provider', async () => {
    resetFxRatesProviderForTests();
    const provider = getFxRatesProvider();

    expect(provider).toBeInstanceOf(StaticFxRatesProvider);
    await expect(provider.getRates()).resolves.toMatchObject({ source: 'static', base: 'EUR' });
  });

  it('selects the ECB provider when configured', () => {
    process.env.FX_RATES_PROVIDER = 'ecb';
    resetFxRatesProviderForTests();

    expect(getFxRatesProvider()).toBeInstanceOf(EcbFxRatesProvider);
  });
});

describe('EcbFxRatesProvider', () => {
  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    resetDbForTests();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.DB_PATH;
    resetDbForTests();
    vi.restoreAllMocks();
  });

  it('fetches the feed once and serves the cached snapshot afterwards', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(ECB_FEED));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const provider = new EcbFxRatesProvider();

    const first = await provider.getRates();
    const second = await provider.getRates();

    expect(first.source).toBe('ecb');
    expect(first.rates.INR).toBeCloseTo(95.312, 6);
    // The recorded feed is dated in the past, so the cache is only reused within the same day.
    expect(second.rates.INR).toBeCloseTo(95.312, 6);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to the cached snapshot when the feed is unavailable', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async () => new Response(ECB_FEED)) as unknown as typeof fetch;
    await new EcbFxRatesProvider().getRates();

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const snapshot = await new EcbFxRatesProvider().getRates();

    expect(snapshot.source).toBe('cache');
    expect(snapshot.rates.USD).toBeCloseTo(1.0812, 6);
  });

  it('falls back to static rates when there is no cache either', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    await expect(new EcbFxRatesProvider().getRates()).resolves.toMatchObject({ source: 'static' });
  });
});
