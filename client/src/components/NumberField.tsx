import { useEffect, useRef, useState } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
  /** Short, realistic sample value shown under the label, e.g. "9,60,000". */
  example?: string;
  min?: number;
  disabled?: boolean;
}

/**
 * Keeps what the user is typing in local state so an existing `0` can be deleted
 * instead of sticking in front of every new digit. The field reports 0 to the
 * parent while it is empty, and re-syncs whenever the parent changes the value
 * from the outside (for example after a Form 26AS import).
 */
export function NumberField({
  label,
  value,
  onChange,
  helpText,
  example,
  min = 0,
  disabled = false,
}: NumberFieldProps) {
  const [text, setText] = useState(() => (value === 0 ? '' : String(value)));
  const textRef = useRef(text);

  // Re-sync when the parent changes the value from the outside
  // (for example after a Form 26AS import), without clobbering what is typed.
  useEffect(() => {
    const typed = textRef.current === '' ? 0 : Number(textRef.current);
    if (!Number.isFinite(typed) || typed !== value) {
      const nextText = value === 0 ? '' : String(value);
      textRef.current = nextText;
      setText(nextText);
    }
  }, [value]);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {example && (
        <span className="mt-0.5 block text-xs font-normal text-slate-400">Example: {example}</span>
      )}
      <input
        type="number"
        inputMode="decimal"
        min={min}
        disabled={disabled}
        placeholder="0"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          textRef.current = raw;
          setText(raw);
          if (raw === '') {
            onChange(0);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : 0);
        }}
        onBlur={() => {
          if (text === '') return;
          const parsed = Number(text);
          const normalised = Number.isFinite(parsed) ? Math.max(min, parsed) : 0;
          const nextText = normalised === 0 ? '' : String(normalised);
          textRef.current = nextText;
          setText(nextText);
        }}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
      />
      {helpText && <span className="mt-1 block text-xs text-slate-500">{helpText}</span>}
    </label>
  );
}
