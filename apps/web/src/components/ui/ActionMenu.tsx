import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useDismiss, type DismissReason } from '@/lib/hooks/use-dismiss';
import { buttonStyles } from './button-styles';

export interface ActionMenuItem {
  label: string;
  /** Smaller second line, e.g. what a template contains. */
  description?: string;
  onSelect: () => void;
  /** Red text, for destructive actions such as Cancel. */
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /**
   * Accessible name of the trigger, e.g. "More actions for Priya Patient". Also its visible
   * text when `showLabel` is set.
   */
  label: string;
  /** Show the label on a button instead of the compact "⋯" icon. */
  showLabel?: boolean;
  disabled?: boolean;
}

/**
 * A button that opens a small list of actions: "⋯" for secondary actions on a row, or a
 * labelled button (showLabel) such as "Quick fill". Closes on selection, outside click or
 * Escape (which returns focus to the button). Renders nothing without items.
 */
export function ActionMenu({ items, label, showLabel = false, disabled = false }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const dismiss = useCallback((reason: DismissReason) => {
    setOpen(false);
    if (reason === 'escape') buttonRef.current?.focus();
  }, []);
  useDismiss(containerRef, open, dismiss);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={showLabel ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={
          showLabel
            ? buttonStyles({ variant: 'secondary', size: 'sm' })
            : cn(
                'inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors',
                'hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50',
                'focus-visible:outline-2 focus-visible:outline-brand-600',
                open && 'bg-slate-100 text-slate-700',
              )
        }
      >
        {showLabel ? (
          <>
            {label}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="size-4"
              aria-hidden="true"
            >
              <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
            <circle cx="4" cy="10" r="1.6" />
            <circle cx="10" cy="10" r="1.6" />
            <circle cx="16" cy="10" r="1.6" />
          </svg>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute right-0 z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg',
            items.some((item) => item.description) ? 'w-64' : 'w-48',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
                item.danger ? 'text-red-600' : 'text-slate-700',
              )}
            >
              {item.label}
              {item.description && (
                <span className="block text-xs text-slate-500">{item.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
