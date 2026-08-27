import { getDb } from '../db';

export interface TaxReturnRecord {
  id: number;
  user_id: number;
  assessment_year: string;
  label: string | null;
  input_json: string;
  result_json: string;
  efiling_status: string | null;
  efiling_ack_number: string | null;
  created_at: string;
  updated_at: string;
}

export function createTaxReturn(
  userId: number,
  assessmentYear: string,
  label: string | undefined,
  input: unknown,
  result: unknown,
): TaxReturnRecord {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO tax_returns (user_id, assessment_year, label, input_json, result_json)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, assessmentYear, label ?? null, JSON.stringify(input), JSON.stringify(result));
  return getTaxReturnById(Number(info.lastInsertRowid)) as TaxReturnRecord;
}

export function listTaxReturnsForUser(userId: number): TaxReturnRecord[] {
  return getDb()
    .prepare('SELECT * FROM tax_returns WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as TaxReturnRecord[];
}

export function getTaxReturnById(id: number): TaxReturnRecord | undefined {
  return getDb().prepare('SELECT * FROM tax_returns WHERE id = ?').get(id) as
    | TaxReturnRecord
    | undefined;
}

export function deleteTaxReturn(id: number, userId: number): boolean {
  const result = getDb()
    .prepare('DELETE FROM tax_returns WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return result.changes > 0;
}

export function updateEfilingStatus(id: number, status: string, ackNumber: string): void {
  getDb()
    .prepare(
      `UPDATE tax_returns SET efiling_status = ?, efiling_ack_number = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(status, ackNumber, id);
}
