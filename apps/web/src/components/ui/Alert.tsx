import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-700',
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  className?: string;
  children?: ReactNode;
}

export function Alert({ tone = 'info', title, className, children }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-md border px-4 py-3 text-sm', TONE_CLASSES[tone], className)}
    >
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cn(title && 'mt-1')}>{children}</div>}
    </div>
  );
}
