import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FieldIds {
  hintId: string;
  errorId: string;
}

/** ids for a control's hint and error text, so the control can reference them. */
export function fieldIds(controlId: string): FieldIds {
  return { hintId: `${controlId}-hint`, errorId: `${controlId}-error` };
}

/** Value for a control's aria-describedby: the hint and/or error ids that are shown. */
export function describedBy(ids: FieldIds, hint?: ReactNode, error?: string): string | undefined {
  if (error) return ids.errorId;
  if (hint) return ids.hintId;
  return undefined;
}

/** Border and focus colours for inputs and selects, red when the field has an error. */
export function controlStyles(hasError: boolean): string {
  return cn(
    'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm',
    'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0',
    'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
    hasError
      ? 'border-red-400 focus:outline-red-500'
      : 'border-slate-300 focus:border-brand-500 focus:outline-brand-500',
  );
}
