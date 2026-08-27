interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
  min?: number;
  disabled?: boolean;
}

export function NumberField({ label, value, onChange, helpText, min = 0, disabled = false }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min={min}
        disabled={disabled}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          onChange(e.target.value === '' ? 0 : Number.isFinite(parsed) ? Math.max(min, parsed) : 0);
        }}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
      />
      {helpText && <span className="mt-1 block text-xs text-slate-500">{helpText}</span>}
    </label>
  );
}
