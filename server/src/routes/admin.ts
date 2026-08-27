import { AssessmentYear, getConfig, listAssessmentYears } from '@tax-break/tax-engine';
import { Router } from 'express';
import { requireAdmin } from '../auth/middleware';
import {
  getConfigOverride,
  getEffectiveConfig,
  isKnownAssessmentYear,
  resetConfigOverride,
  saveConfigOverride,
} from '../db/configRepository';
import { ValidationError } from '../validation';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/config/:assessmentYear', (req, res) => {
  const { assessmentYear } = req.params;
  if (!isKnownAssessmentYear(assessmentYear)) {
    res.status(404).json({
      error: `Unknown assessment year: ${assessmentYear}. Supported: ${listAssessmentYears().join(', ')}`,
    });
    return;
  }
  const override = getConfigOverride(assessmentYear);
  res.json({
    assessmentYear,
    config: getEffectiveConfig(assessmentYear),
    defaultConfig: getConfig(assessmentYear),
    hasOverride: Boolean(override),
    updatedAt: override?.updated_at ?? null,
  });
});

adminRouter.put('/config/:assessmentYear', (req, res, next) => {
  try {
    const { assessmentYear } = req.params;
    if (!isKnownAssessmentYear(assessmentYear)) {
      throw new ValidationError(
        `Unknown assessment year: ${assessmentYear}. Supported: ${listAssessmentYears().join(', ')}`,
      );
    }
    const config = req.body?.config;
    if (typeof config !== 'object' || config === null) {
      throw new ValidationError('config object is required');
    }
    saveConfigOverride(assessmentYear as AssessmentYear, config, req.user!.id);
    res.json({ assessmentYear, config: getEffectiveConfig(assessmentYear as AssessmentYear) });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/config/:assessmentYear', (req, res) => {
  const { assessmentYear } = req.params;
  if (!isKnownAssessmentYear(assessmentYear)) {
    res.status(404).json({
      error: `Unknown assessment year: ${assessmentYear}. Supported: ${listAssessmentYears().join(', ')}`,
    });
    return;
  }
  resetConfigOverride(assessmentYear);
  res.json({ assessmentYear, config: getEffectiveConfig(assessmentYear) });
});
