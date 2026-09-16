import { Router } from 'express';
import type { ItrForm, RegimeComparisonResult, TaxCalculationInput } from '@tax-break/tax-engine';
import { generateItrJson, recommendItrForm } from '@tax-break/tax-engine';
import { requireAuth } from '../auth/middleware';
import {
  createTaxReturn,
  deleteTaxReturn,
  getTaxReturnById,
  listTaxReturnsForUser,
  updateEfilingStatus,
} from '../db/taxReturnRepository';
import {
  renderTaxReturnPdfBuffer,
  streamTaxReturnExcel,
  streamTaxReturnPdf,
} from '../services/export';
import { EFilingError, getEFilingProvider } from '../services/efilingProvider';
import { getMailProvider } from '../services/mailProvider';
import { ValidationError, validateItrTaxpayerDetails } from '../validation';

export const taxReturnsRouter = Router();

taxReturnsRouter.use(requireAuth);

function loadOwnedTaxReturn(id: number, userId: number) {
  const record = getTaxReturnById(id);
  if (!record || record.user_id !== userId) {
    return undefined;
  }
  return record;
}

taxReturnsRouter.post('/', (req, res, next) => {
  try {
    const { assessmentYear, label, input, result } = req.body ?? {};
    if (typeof assessmentYear !== 'string' || !assessmentYear) {
      throw new ValidationError('assessmentYear is required');
    }
    if (typeof input !== 'object' || input === null) {
      throw new ValidationError('input is required');
    }
    if (typeof result !== 'object' || result === null) {
      throw new ValidationError('result is required');
    }
    const record = createTaxReturn(req.user!.id, assessmentYear, label, input, result);
    res.status(201).json(serializeTaxReturn(record));
  } catch (err) {
    next(err);
  }
});

taxReturnsRouter.get('/', (req, res) => {
  const records = listTaxReturnsForUser(req.user!.id);
  res.json(records.map(serializeTaxReturn));
});

taxReturnsRouter.get('/:id', (req, res) => {
  const record = loadOwnedTaxReturn(Number(req.params.id), req.user!.id);
  if (!record) {
    res.status(404).json({ error: 'Tax return not found' });
    return;
  }
  res.json(serializeTaxReturn(record));
});

taxReturnsRouter.delete('/:id', (req, res) => {
  const deleted = deleteTaxReturn(Number(req.params.id), req.user!.id);
  if (!deleted) {
    res.status(404).json({ error: 'Tax return not found' });
    return;
  }
  res.status(204).send();
});

taxReturnsRouter.get('/:id/export/pdf', (req, res) => {
  const record = loadOwnedTaxReturn(Number(req.params.id), req.user!.id);
  if (!record) {
    res.status(404).json({ error: 'Tax return not found' });
    return;
  }
  streamTaxReturnPdf(res, record);
});

taxReturnsRouter.get('/:id/export/xlsx', async (req, res, next) => {
  try {
    const record = loadOwnedTaxReturn(Number(req.params.id), req.user!.id);
    if (!record) {
      res.status(404).json({ error: 'Tax return not found' });
      return;
    }
    await streamTaxReturnExcel(res, record);
  } catch (err) {
    next(err);
  }
});

taxReturnsRouter.post('/:id/efile', async (req, res, next) => {
  try {
    const record = loadOwnedTaxReturn(Number(req.params.id), req.user!.id);
    if (!record) {
      res.status(404).json({ error: 'Tax return not found' });
      return;
    }
    if (record.efiling_ack_number && record.efiling_status !== 'rejected') {
      throw new EFilingError(
        'This return has already been submitted for e-filing ' +
          `(acknowledgement ${record.efiling_ack_number}). Check its status instead of ` +
          'resubmitting.',
        409,
      );
    }
    const provider = getEFilingProvider();
    const input = JSON.parse(record.input_json) as TaxCalculationInput;
    const result = JSON.parse(record.result_json) as RegimeComparisonResult;

    // Real filing needs the personal details a computation does not: PAN, name, date of birth.
    // They are supplied per request and are never stored with the saved calculation.
    const taxpayer = req.body?.taxpayer ? validateItrTaxpayerDetails(req.body.taxpayer) : undefined;
    let itrForm: ItrForm | undefined;
    let itrJson: Record<string, unknown> | undefined;
    if (taxpayer) {
      itrForm = recommendItrForm({
        ...(input.otherIncomeSources ?? {}),
        hasSalaryIncome: Boolean(input.salary),
        hasSingleHouseProperty: Boolean(input.houseProperty),
        hasCapitalGains: hasCapitalGains(input),
        totalIncome: result[result.recommendedRegime].grossTotalIncome,
        isResidentIndividual: true,
      }).recommendedForm;
      itrJson = generateItrJson({
        form: itrForm,
        assessmentYear: input.assessmentYear,
        input,
        result,
        taxpayer,
      });
    } else if (!provider.simulated) {
      throw new EFilingError(
        'Filing through an e-filing intermediary requires your PAN, name and date of birth.',
        400,
      );
    }

    const submission = await provider.fileReturn({
      userId: req.user!.id,
      taxReturnId: record.id,
      assessmentYear: record.assessment_year,
      itrForm,
      itrJson,
    });
    updateEfilingStatus(
      record.id,
      submission.status,
      submission.acknowledgementNumber,
      submission.provider,
    );
    res.json({ ...submission, itrForm });
  } catch (err) {
    next(err);
  }
});

/** Refreshes the filing status of a return from the provider that accepted it. */
taxReturnsRouter.get('/:id/efile-status', async (req, res, next) => {
  try {
    const record = loadOwnedTaxReturn(Number(req.params.id), req.user!.id);
    if (!record) {
      res.status(404).json({ error: 'Tax return not found' });
      return;
    }
    if (!record.efiling_ack_number) {
      res.status(404).json({ error: 'This return has not been submitted for e-filing yet.' });
      return;
    }
    const submission = await getEFilingProvider().getStatus(record.efiling_ack_number);
    updateEfilingStatus(
      record.id,
      submission.status,
      submission.acknowledgementNumber,
      submission.provider,
    );
    res.json(submission);
  } catch (err) {
    next(err);
  }
});

/** Emails the PDF export of a saved calculation to the signed-in user. */
taxReturnsRouter.post('/:id/email', async (req, res, next) => {
  try {
    const record = loadOwnedTaxReturn(Number(req.params.id), req.user!.id);
    if (!record) {
      res.status(404).json({ error: 'Tax return not found' });
      return;
    }
    const pdf = await renderTaxReturnPdfBuffer(record);
    const result = await getMailProvider().send({
      to: req.user!.email,
      subject: `Your ${record.assessment_year} tax calculation`,
      text:
        'Attached is the PDF of the tax calculation you saved on Tax Break. This is an estimate ' +
        'and not a filed return.',
      attachments: [
        {
          filename: `tax-return-${record.id}.pdf`,
          content: pdf.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

function hasCapitalGains(input: TaxCalculationInput): boolean {
  const gains = input.capitalGains;
  if (!gains) return false;
  return Boolean(
    (gains.equitySTCG ?? 0) ||
      (gains.equityLTCG ?? 0) ||
      (gains.otherSTCG ?? 0) ||
      (gains.otherLTCG ?? 0),
  );
}

function serializeTaxReturn(record: ReturnType<typeof getTaxReturnById>) {
  if (!record) return record;
  return {
    id: record.id,
    assessmentYear: record.assessment_year,
    label: record.label,
    input: JSON.parse(record.input_json),
    result: JSON.parse(record.result_json),
    efilingStatus: record.efiling_status,
    efilingAckNumber: record.efiling_ack_number,
    efilingProvider: record.efiling_provider,
    efilingCheckedAt: record.efiling_checked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
