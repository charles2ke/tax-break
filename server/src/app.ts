import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { compareRegimes, getConfig, listAssessmentYears } from '@tax-break/tax-engine';
import { ValidationError, validateTaxCalculationInput } from './validation';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/config/:assessmentYear', (req: Request, res: Response) => {
    const { assessmentYear } = req.params;
    if (!listAssessmentYears().includes(assessmentYear as never)) {
      return res.status(404).json({
        error: `Unknown assessment year: ${assessmentYear}. Supported: ${listAssessmentYears().join(', ')}`,
      });
    }
    const config = getConfig(assessmentYear as never);
    return res.json(config);
  });

  app.post('/api/calculate', (req: Request, res: Response) => {
    const input = validateTaxCalculationInput(req.body);
    const result = compareRegimes(input);
    return res.json(result);
  });

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
