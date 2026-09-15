import { Router } from 'express';
import { parseForm26AS } from '@tax-break/tax-engine';
import { requireAuth } from '../auth/middleware';
import { EFilingError, getEFilingProvider } from '../services/efilingProvider';
import { convertAmount, getFxRatesProvider } from '../services/fxRates';
import { listEnabledOAuthProviders } from '../services/oauthProviders';
import { ValidationError } from '../validation';

export const integrationsRouter = Router();

const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;

/** Reports which external integrations this deployment is wired up to. */
integrationsRouter.get('/status', (_req, res) => {
  const efiling = getEFilingProvider();
  res.json({
    efiling: { provider: efiling.name, simulated: efiling.simulated },
    form26ASDownload: typeof efiling.fetchForm26AS === 'function',
    fxRates: { provider: getFxRatesProvider().name },
    oauthProviders: listEnabledOAuthProviders(),
  });
});

/**
 * Downloads the signed-in user's Form 26AS / AIS statement through the e-filing intermediary and
 * returns the same summary the browser-side upload produces, so the client flow is identical
 * whether the statement was fetched or uploaded.
 */
integrationsRouter.post('/form-26as', requireAuth, async (req, res, next) => {
  try {
    const provider = getEFilingProvider();
    if (typeof provider.fetchForm26AS !== 'function') {
      throw new EFilingError(
        'Form 26AS download is not available on this server. Upload the statement from the ' +
          'income tax portal instead.',
        501,
      );
    }
    const { assessmentYear, pan } = req.body ?? {};
    if (typeof assessmentYear !== 'string' || !assessmentYear) {
      throw new ValidationError('assessmentYear is required');
    }
    const normalisedPan = typeof pan === 'string' ? pan.toUpperCase() : '';
    if (!PAN_PATTERN.test(normalisedPan)) {
      throw new ValidationError('pan must be a valid PAN, e.g. ABCDE1234F');
    }

    const statement = await provider.fetchForm26AS({
      userId: req.user!.id,
      assessmentYear,
      pan: normalisedPan,
    });
    res.json({ summary: parseForm26AS(statement), source: provider.name });
  } catch (err) {
    next(err);
  }
});

/**
 * Daily reference exchange rates, optionally converting a single amount. Used to show a
 * multi-country estimate in a second currency.
 */
integrationsRouter.get('/fx-rates', async (req, res, next) => {
  try {
    const snapshot = await getFxRatesProvider().getRates();
    const { from, to, amount } = req.query;

    if (from === undefined && to === undefined && amount === undefined) {
      res.json(snapshot);
      return;
    }
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw new ValidationError('from and to currency codes are required to convert an amount');
    }
    const value = Number(amount ?? 1);
    if (!Number.isFinite(value)) {
      throw new ValidationError('amount must be a number');
    }
    let converted: number;
    try {
      converted = convertAmount(value, from.toUpperCase(), to.toUpperCase(), snapshot);
    } catch {
      throw new ValidationError(`No exchange rate is available for ${from} to ${to}`);
    }
    res.json({
      ...snapshot,
      conversion: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        amount: value,
        converted,
      },
    });
  } catch (err) {
    next(err);
  }
});
