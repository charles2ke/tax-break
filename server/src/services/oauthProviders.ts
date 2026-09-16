/**
 * OAuth 2.0 sign-in with Google and GitHub.
 *
 * Both providers use the standard authorization-code flow, so a single implementation covers
 * them: redirect the browser to the provider, exchange the returned code for an access token on
 * the server, then read the verified email address. A provider is only offered when its client
 * id and secret are present in the environment, which keeps local development and CI free of
 * credentials.
 */

import { httpRequestJson } from './http';

export type OAuthProviderName = 'google' | 'github';

export interface OAuthProfile {
  email: string;
  /** Stable identifier of the account at the provider. */
  subject: string;
}

interface OAuthProviderConfig {
  name: OAuthProviderName;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

export class OAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'OAuthError';
    this.status = status;
  }
}

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: ['Bearer', accessToken].join(' ') };
}

const PROVIDERS: Record<OAuthProviderName, OAuthProviderConfig> = {
  google: {
    name: 'google',
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    async fetchProfile(accessToken: string): Promise<OAuthProfile> {
      const profile = await httpRequestJson<{
        sub?: string;
        email?: string;
        email_verified?: boolean;
      }>('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: authHeaders(accessToken),
        label: 'google userinfo',
      });
      if (!profile.email || profile.email_verified !== true) {
        throw new OAuthError('Google did not return a verified email address.');
      }
      return { email: profile.email, subject: profile.sub ?? profile.email };
    },
  },
  github: {
    name: 'github',
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    async fetchProfile(accessToken: string): Promise<OAuthProfile> {
      const user = await httpRequestJson<{ id?: number }>('https://api.github.com/user', {
        headers: authHeaders(accessToken),
        label: 'github user',
      });
      const emails = await httpRequestJson<
        Array<{ email: string; primary: boolean; verified: boolean }>
      >('https://api.github.com/user/emails', {
        headers: authHeaders(accessToken),
        label: 'github user emails',
      });
      const email = emails.find((entry) => entry.primary && entry.verified)?.email;
      if (!email) {
        throw new OAuthError('GitHub did not return a verified email address.');
      }
      return { email, subject: String(user.id ?? email) };
    },
  },
};

export function isOAuthProviderName(value: string): value is OAuthProviderName {
  return value === 'google' || value === 'github';
}

function credentials(config: OAuthProviderConfig): { clientId: string; clientSecret: string } {
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new OAuthError(`${config.label} sign-in is not configured on this server.`, 404);
  }
  return { clientId, clientSecret };
}

/** Lists the providers that are fully configured, for the sign-in page to render buttons. */
export function listEnabledOAuthProviders(): Array<{ name: OAuthProviderName; label: string }> {
  if (!process.env.OAUTH_REDIRECT_BASE_URL) return [];
  return Object.values(PROVIDERS)
    .filter((config) => process.env[config.clientIdEnv] && process.env[config.clientSecretEnv])
    .map((config) => ({ name: config.name, label: config.label }));
}

/** Absolute URL the provider redirects back to, e.g. https://example.com/api/auth/oauth/google/callback. */
export function redirectUri(provider: OAuthProviderName): string {
  const base = process.env.OAUTH_REDIRECT_BASE_URL;
  if (!base) {
    throw new OAuthError('OAUTH_REDIRECT_BASE_URL must be set to enable OAuth sign-in.', 500);
  }
  return `${base.replace(/\/$/, '')}/api/auth/oauth/${provider}/callback`;
}

/** Builds the provider's authorization URL for the given anti-forgery state value. */
export function buildAuthorizationUrl(provider: OAuthProviderName, state: string): string {
  const config = PROVIDERS[provider];
  const { clientId } = credentials(config);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(provider),
    response_type: 'code',
    scope: config.scope,
    state,
  });
  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for the signed-in user's verified email address.
 *
 * @throws {OAuthError} when the provider is unconfigured or rejects the exchange.
 */
export async function exchangeCodeForProfile(
  provider: OAuthProviderName,
  code: string,
): Promise<OAuthProfile> {
  const config = PROVIDERS[provider];
  const { clientId, clientSecret } = credentials(config);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(provider),
  }).toString();

  let token: { access_token?: string };
  try {
    token = await httpRequestJson<{ access_token?: string }>(config.tokenUrl, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      label: `${config.name} token endpoint`,
    });
  } catch {
    throw new OAuthError(`${config.label} could not be reached to complete sign-in.`, 502);
  }
  if (!token.access_token) {
    throw new OAuthError(`${config.label} did not return an access token.`, 502);
  }
  return config.fetchProfile(token.access_token);
}
