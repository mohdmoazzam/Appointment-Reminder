import { cn } from '@/lib/cn';
import { tabId, tabPanelId } from './tab-ids';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  /** Shown as a small number after the label, e.g. how many invites are pending. */
  count?: number;
}

interface TabsProps<T extends string> {
  /** Accessible name of the tab list. */
  label: string;
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * An underlined tab bar. The parent renders the active panel; give it
 * `id={tabPanelId(id)}` and `aria-labelledby={tabId(id)}` (from tab-ids.ts) so tab and panel are linked.
 */
export function Tabs<T extends string>({ label, tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-6 border-b border-slate-200', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(tab.id)}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
              selected
                ? 'border-brand-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  selected ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
