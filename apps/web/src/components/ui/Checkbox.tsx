import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'className'> {
  label: ReactNode;
  /** Smaller text under the label. */
  description?: ReactNode;
  className?: string;
}

/** A checkbox with its label; works with react-hook-form's register for boolean fields. */
export function Checkbox({ label, description, className, id, ...inputProps }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-brand-600 disabled:cursor-not-allowed"
        {...inputProps}
      />
      <label htmlFor={inputId} className="text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {description && <span className="block text-slate-500">{description}</span>}
      </label>
    </div>
  );
}
