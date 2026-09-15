/**
 * Transactional email for exported calculations and e-filing acknowledgements.
 *
 * The default provider only logs the message, so the app runs with no mail credentials at all.
 * Setting `MAIL_PROVIDER=http` sends the message through an HTTPS email API (Resend, Postmark,
 * SendGrid and Mailgun all accept a JSON body of this shape), which avoids adding an SMTP
 * dependency while still being a real integration.
 */

import { httpRequestJson } from './http';

export interface MailAttachment {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
  contentType: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}

export interface MailResult {
  delivered: boolean;
  provider: string;
  message: string;
}

export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<MailResult>;
}

export class MailError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'MailError';
    this.status = status;
  }
}

/** Default provider: writes a one-line summary to the server log and delivers nothing. */
export class ConsoleMailProvider implements MailProvider {
  readonly name = 'console';

  async send(message: MailMessage): Promise<MailResult> {
    // eslint-disable-next-line no-console
    console.info(
      `[integrations] email (not sent, MAIL_PROVIDER is not configured): "${message.subject}" ` +
        `with ${message.attachments?.length ?? 0} attachment(s)`,
    );
    return {
      delivered: false,
      provider: this.name,
      message:
        'Email delivery is not configured on this server, so nothing was sent. Set MAIL_PROVIDER ' +
        'and the mail API credentials to enable it.',
    };
  }
}

/** Sends through an HTTPS email API using a bearer token. */
export class HttpMailProvider implements MailProvider {
  readonly name = 'http';

  async send(message: MailMessage): Promise<MailResult> {
    const url = process.env.MAIL_API_URL;
    const apiKey = process.env.MAIL_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!url || !apiKey || !from) {
      throw new MailError('MAIL_PROVIDER=http requires MAIL_API_URL, MAIL_API_KEY and MAIL_FROM.', 500);
    }

    try {
      await httpRequestJson<unknown>(url, {
        method: 'POST',
        headers: { Authorization: ['Bearer', apiKey].join(' ') },
        json: {
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          attachments: message.attachments,
        },
        label: 'email api',
      });
    } catch {
      throw new MailError('The email provider could not be reached.');
    }

    return { delivered: true, provider: this.name, message: 'Email sent.' };
  }
}

let cachedProvider: MailProvider | undefined;
let cachedProviderKey: string | undefined;

/** Returns the configured mail provider; defaults to the console (no-op) provider. */
export function getMailProvider(): MailProvider {
  const key = process.env.MAIL_PROVIDER ?? 'console';
  if (cachedProvider && cachedProviderKey === key) return cachedProvider;
  cachedProvider = key === 'http' ? new HttpMailProvider() : new ConsoleMailProvider();
  cachedProviderKey = key;
  return cachedProvider;
}

/** Test helper: clears the memoised provider so a changed environment is picked up. */
export function resetMailProviderForTests(): void {
  cachedProvider = undefined;
  cachedProviderKey = undefined;
}
