import type { ReactNode } from 'react';
import { Checkbox } from './Checkbox';

export interface CheckboxListOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
}

interface CheckboxListProps {
  /** Visible heading for the group (rendered as a <legend>). */
  legend: string;
  options: readonly CheckboxListOption[];
  /** The checked values. */
  value: readonly string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  /** Shown instead of the list when there are no options. */
  emptyMessage?: ReactNode;
  error?: string;
}

/**
 * Pick several values from a list, e.g. which staff offer a service. Controlled; use it with
 * react-hook-form's <Controller> (a plain register() on a checkbox group returns a boolean
 * instead of an array when there is only one option).
 */
export function CheckboxList({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  emptyMessage = 'Nothing to choose from yet.',
  error,
}: CheckboxListProps) {
  const toggle = (optionValue: string, checked: boolean) => {
    if (checked) onChange([...value, optionValue]);
    else onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-slate-700">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-slate-200 p-3">
          {options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              description={option.description}
              checked={value.includes(option.value)}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
