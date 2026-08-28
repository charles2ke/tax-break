import crypto from 'crypto';

export interface EFilingSubmission {
  status: 'submitted' | 'accepted' | 'rejected';
  acknowledgementNumber: string;
  submittedAt: string;
  message: string;
}

export interface EFilingProvider {
  /** Submits a return for e-filing and returns an acknowledgement. */
  fileReturn(payload: { userId: number; taxReturnId: number }): Promise<EFilingSubmission>;
}

/**
 * Mock e-filing provider. Real integration with the Income Tax Department's e-filing portal (or
 * a licensed ERI/GSP intermediary) requires registration, credentials, and compliance review
 * that cannot be completed purely through code changes. This mock simulates a successful
 * submission so the rest of the product (UI, persistence, status tracking) can be built and
 * tested end-to-end, and can be swapped for a real implementation once API access is available.
 */
export class MockEFilingProvider implements EFilingProvider {
  async fileReturn(payload: { userId: number; taxReturnId: number }): Promise<EFilingSubmission> {
    const acknowledgementNumber = `MOCK-${payload.taxReturnId}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
    return {
      status: 'submitted',
      acknowledgementNumber,
      submittedAt: new Date().toISOString(),
      message:
        'This is a simulated e-filing submission for demonstration purposes only. It has not ' +
        'been sent to the Income Tax Department. Real e-filing requires an authorized ERI/GSP ' +
        'integration.',
    };
  }
}

export const efilingProvider: EFilingProvider = new MockEFilingProvider();
