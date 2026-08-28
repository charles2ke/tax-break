import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import {
  createTaxReturn,
  deleteTaxReturn,
  getTaxReturnById,
  listTaxReturnsForUser,
  updateEfilingStatus,
} from '../db/taxReturnRepository';
import { streamTaxReturnExcel, streamTaxReturnPdf } from '../services/export';
import { efilingProvider } from '../services/efilingProvider';
import { ValidationError } from '../validation';

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
    const submission = await efilingProvider.fileReturn({
      userId: req.user!.id,
      taxReturnId: record.id,
    });
    updateEfilingStatus(record.id, submission.status, submission.acknowledgementNumber);
    res.json(submission);
  } catch (err) {
    next(err);
  }
});

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
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
