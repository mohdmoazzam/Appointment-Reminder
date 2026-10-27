import { Button } from './Button';

interface SaveBarProps {
  /** Show the bar (usually the form's isDirty). */
  visible: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  /** Label of the submit button, e.g. "Save changes". The bar must sit inside the form. */
  saveLabel?: string;
  message?: string;
}

/**
 * A floating "unsaved changes" bar with Discard and Save, shown only when there is something to
 * save. Its Save button submits the surrounding form.
 */
export function SaveBar({
  visible,
  isSaving,
  onDiscard,
  saveLabel = 'Save changes',
  message = 'You have unsaved changes',
}: SaveBarProps) {
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur"
    >
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={isSaving} onClick={onDiscard}>
          Discard
        </Button>
        <Button type="submit" size="sm" isLoading={isSaving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
