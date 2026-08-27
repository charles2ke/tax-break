import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  calculateAdvanceTax,
  calculateInternationalTax,
  compareRegimes,
  listAssessmentYears,
  recommendItrForm,
} from '@tax-break/tax-engine';
import { attachUser } from './auth/middleware';
import { getEffectiveConfig, isKnownAssessmentYear } from './db/configRepository';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { taxReturnsRouter } from './routes/taxReturns';
import {
  ValidationError,
  validateAdvanceTaxInput,
  validateInternationalTaxCalculationInput,
  validateItrRecommenderInput,
  validateTaxCalculationInput,
} from './validation';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173'];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS;
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Lightweight CSRF mitigation: since authentication is carried via a cookie, reject
 * state-changing requests (non-GET/HEAD/OPTIONS) whose Origin (or Referer, as a fallback for
 * clients that omit Origin) header is not one of the explicitly allowed origins. Combined with
 * the `SameSite=Lax` cookie attribute, this prevents cross-site requests from third-party pages
 * from performing authenticated actions on behalf of a logged-in user.
 */
function csrfOriginCheck(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin') ?? req.get('referer');
    if (!origin) return next();
    const isAllowed = allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(`${allowed}/`));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Request origin is not allowed' });
    }
    return next();
  };
}

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(csrfOriginCheck(allowedOrigins));
  app.use(attachUser);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/config/:assessmentYear', (req: Request, res: Response) => {
    const { assessmentYear } = req.params;
    if (!isKnownAssessmentYear(assessmentYear)) {
      return res.status(404).json({
        error: `Unknown assessment year: ${assessmentYear}. Supported: ${listAssessmentYears().join(', ')}`,
      });
    }
    const config = getEffectiveConfig(assessmentYear);
    return res.json(config);
  });

  app.post('/api/calculate', (req: Request, res: Response) => {
    if (req.body?.country && req.body.country !== 'india') {
      return res.json(
        calculateInternationalTax(validateInternationalTaxCalculationInput(req.body)),
      );
    }
    const input = validateTaxCalculationInput(req.body);
    const configOverride = isKnownAssessmentYear(input.assessmentYear)
      ? getEffectiveConfig(input.assessmentYear)
      : undefined;
    const result = compareRegimes(input, configOverride);
    return res.json(result);
  });

  app.post('/api/advance-tax', (req: Request, res: Response) => {
    const input = validateAdvanceTaxInput(req.body);
    const result = calculateAdvanceTax(
      input.totalTaxLiability,
      input.taxAlreadyPaid,
      input.assessmentYear,
    );
    return res.json(result);
  });

  app.post('/api/itr-recommendation', (req: Request, res: Response) => {
    const input = validateItrRecommenderInput(req.body);
    const result = recommendItrForm(input);
    return res.json(result);
  });

  app.use('/api/auth', authRateLimiter, authRouter);
  app.use('/api/tax-returns', taxReturnsRouter);
  app.use('/api/admin', adminRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

