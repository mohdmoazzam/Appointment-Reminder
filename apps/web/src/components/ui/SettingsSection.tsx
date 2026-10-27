import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/**
 * One group of settings: title and explanation on the left, the fields in a card on the right
 * (stacked on small screens).
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {children}
      </div>
    </section>
  );
}
