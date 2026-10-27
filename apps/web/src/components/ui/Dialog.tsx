import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  /** Called on Escape, backdrop click and the close button. The parent sets open=false. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** "lg" for longer forms such as booking an appointment. */
  size?: 'md' | 'lg';
  children: ReactNode;
}

const SIZE_CLASSES = { md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/**
 * A modal built on the native <dialog> element, which handles focus trapping, Escape and the
 * backdrop. Content is only rendered while open, so forms inside start fresh every time.
 */
export function Dialog({ open, onClose, title, description, size = 'md', children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Keep the element's open state in sync with the prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A click whose target is the <dialog> itself landed on the backdrop, not the content.
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={handleClick}
      className={`m-auto w-[calc(100%-2rem)] ${SIZE_CLASSES[size]} rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Right-aligned row for a dialog's buttons. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-3">{children}</div>;
}
