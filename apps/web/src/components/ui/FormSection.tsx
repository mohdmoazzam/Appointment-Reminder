import type { ReactNode } from 'react';

interface FormSectionProps {
  /** Shown in a small circle before the title, e.g. 1, 2, 3. */
  step: number;
  title: string;
  children: ReactNode;
}

/** A numbered part of a longer form ("1 Service", "2 When", "3 Customer"). */
export function FormSection({ step, title, children }: FormSectionProps) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {step}
        </span>
        {title}
      </h3>
      <div className="pl-0 sm:pl-8">{children}</div>
    </section>
  );
}
