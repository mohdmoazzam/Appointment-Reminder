import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fieldIds } from './field-styles';

interface FieldProps {
  label: string;
  controlId: string;
  hint?: ReactNode;
  error?: string;
  /** Adds "(optional)" after the label. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label, control, hint and error message laid out the same way for every form field. The
 * hint is replaced by the error when there is one (see describedBy in field-styles.ts).
 */
export function Field({
  label,
  controlId,
  hint,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  const ids = fieldIds(controlId);
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={controlId} className="block text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={ids.errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={ids.hintId} className="text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
