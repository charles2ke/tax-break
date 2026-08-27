import { useState } from 'react';
import type {
  InternationalTaxCalculationInput,
  InternationalTaxResult,
  RegimeComparisonResult,
  TaxCalculationInput,
} from '@tax-break/tax-engine';
import { calculateTax, ApiError } from './api';
import { AuthProvider, useAuth } from './AuthContext';
import { LandingPage } from './components/LandingPage';
import { TaxForm } from './components/TaxForm';
import { ResultsView } from './components/ResultsView';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { SavedReturnsPage } from './components/SavedReturnsPage';
import { AdminConfigPage } from './components/AdminConfigPage';

type View = 'landing' | 'form' | 'results' | 'login' | 'signup' | 'saved-returns' | 'admin';

function NavBar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { user, logout } = useAuth();
  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => setView('landing')}
        className="text-lg font-bold text-slate-900"
      >
        Tax Break
      </button>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <button
              type="button"
              onClick={() => setView('saved-returns')}
              className={`font-medium ${view === 'saved-returns' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              My Returns
            </button>
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => setView('admin')}
                className={`font-medium ${view === 'admin' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
              >
                Admin
              </button>
            )}
            <span className="text-slate-500">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                setView('landing');
              }}
              className="font-medium text-slate-600 hover:text-indigo-600"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView('login')}
              className={`font-medium ${view === 'login' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setView('signup')}
              className={`font-medium ${view === 'signup' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function AppShell() {
  const [view, setView] = useState<View>('landing');
  const [result, setResult] = useState<RegimeComparisonResult | InternationalTaxResult | null>(
    null,
  );
  const [lastInput, setLastInput] = useState<TaxCalculationInput | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSubmit = async (input: TaxCalculationInput | InternationalTaxCalculationInput) => {
    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const response = await calculateTax(input);
      setResult(response);
      setLastInput('country' in input ? undefined : input);
      setView('results');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar view={view} setView={setView} />
      {view === 'landing' && <LandingPage onGetStarted={() => setView('form')} />}
      {view === 'form' && (
        <TaxForm onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={errorMessage} />
      )}
      {view === 'results' && result && (
        <ResultsView
          result={result}
          input={lastInput}
          onBack={() => setView('form')}
          onRequireLogin={() => setView('login')}
        />
      )}
      {view === 'login' && (
        <LoginPage onSuccess={() => setView('form')} onSwitchToSignup={() => setView('signup')} />
      )}
      {view === 'signup' && (
        <SignupPage onSuccess={() => setView('form')} onSwitchToLogin={() => setView('login')} />
      )}
      {view === 'saved-returns' && <SavedReturnsPage onBack={() => setView('landing')} />}
      {view === 'admin' && <AdminConfigPage onBack={() => setView('landing')} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
