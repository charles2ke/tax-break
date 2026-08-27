import { useState } from 'react';
import type {
  InternationalTaxCalculationInput,
  InternationalTaxResult,
  RegimeComparisonResult,
  TaxCalculationInput,
} from '@tax-break/tax-engine';
import { calculateTax, ApiError } from './api';
import { LandingPage } from './components/LandingPage';
import { TaxForm } from './components/TaxForm';
import { ResultsView } from './components/ResultsView';

type View = 'landing' | 'form' | 'results';

function App() {
  const [view, setView] = useState<View>('landing');
  const [result, setResult] = useState<RegimeComparisonResult | InternationalTaxResult | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSubmit = async (input: TaxCalculationInput | InternationalTaxCalculationInput) => {
    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const response = await calculateTax(input);
      setResult(response);
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
      {view === 'landing' && <LandingPage onGetStarted={() => setView('form')} />}
      {view === 'form' && (
        <TaxForm onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={errorMessage} />
      )}
      {view === 'results' && result && (
        <ResultsView result={result} onBack={() => setView('form')} />
      )}
    </div>
  );
}

export default App;
