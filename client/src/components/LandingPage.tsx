interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Tax Break
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Estimate your Indian Annual Income Tax in minutes. Compare the Old Regime and the New
        Regime side-by-side and find out which one saves you more money.
      </p>
      <ul className="mt-8 grid gap-3 text-left text-sm text-slate-700 sm:grid-cols-2">
        <li className="rounded-lg bg-slate-50 p-4 shadow-sm">
          📅 Supports FY 2024-25 and FY 2025-26 slab rates
        </li>
        <li className="rounded-lg bg-slate-50 p-4 shadow-sm">
          🏠 HRA exemption and house property calculations
        </li>
        <li className="rounded-lg bg-slate-50 p-4 shadow-sm">
          🧾 Section 80C, 80D, 80CCD(1B), 80TTA/TTB, 80E, 80G deductions
        </li>
        <li className="rounded-lg bg-slate-50 p-4 shadow-sm">
          ⚖️ Automatic Old vs New regime comparison with recommendation
        </li>
      </ul>
      <button
        type="button"
        onClick={onGetStarted}
        className="mt-10 rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        Calculate My Tax
      </button>
      <p className="mt-6 text-xs text-slate-400">
        This tool is for informational and estimation purposes only. It is not a substitute for
        professional tax advice or official e-filing.
      </p>
    </div>
  );
}
