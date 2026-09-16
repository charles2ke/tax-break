import { useEffect, useState } from 'react';
import { getIntegrationStatus, oauthStartUrl } from '../api';

interface Props {
  /** Verb shown on the buttons, e.g. "Log in" or "Sign up". */
  action: string;
}

/**
 * Sign-in buttons for the OAuth providers this deployment has credentials for. Nothing is rendered
 * when no provider is configured, so the local-password flow stays the only option by default.
 */
export function OAuthButtons({ action }: Props) {
  const [providers, setProviders] = useState<Array<{ name: string; label: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    void getIntegrationStatus().then((status) => {
      if (!cancelled) setProviders(status?.oauthProviders ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="mt-4 space-y-2">
        {providers.map((provider) => (
          <a
            key={provider.name}
            href={oauthStartUrl(provider.name)}
            className="block w-full rounded-md border border-slate-300 px-6 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {action} with {provider.label}
          </a>
        ))}
      </div>
    </div>
  );
}
