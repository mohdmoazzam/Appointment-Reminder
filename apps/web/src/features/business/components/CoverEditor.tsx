import { useRef, useState, type ChangeEvent } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { IMAGE_ACCEPT, MAX_ASSET_BYTES, formatBytes, validateImageFile } from '@/features/assets/validation';
import { getErrorMessage } from '@/lib/api/api-error';
import type { Business } from '@/types/models';
import { useRemoveBusinessImage, useReplaceBusinessImage } from '../queries';

interface CoverEditorProps {
  business: Business;
  /** Owners can upload and remove; everyone else just sees the cover. */
  canEdit: boolean;
}

const overlayButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-slate-900/75 disabled:opacity-60';

/**
 * The wide banner across the top of the booking page. Without one, the brand gradient the
 * booking page also falls back to is shown.
 */
export function CoverEditor({ business, canEdit }: CoverEditorProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const replaceMutation = useReplaceBusinessImage('cover_asset_id');
  const removeMutation = useRemoveBusinessImage();
  const isBusy = replaceMutation.isPending || removeMutation.isPending;
  const error = fileError ?? (replaceMutation.error ? getErrorMessage(replaceMutation.error) : null);

  const handleFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file again still fires a change event.
    event.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    setFileError(validationError);
    if (validationError) return;

    replaceMutation.mutate({ file, previousAssetId: business.cover_asset_id }, { onSuccess: () => toast.success('Cover image updated') });
  };

  const removeCover = () => {
    if (!business.cover_asset_id) return;
    removeMutation.mutate(business.cover_asset_id, {
      onSuccess: () => {
        setConfirmingRemove(false);
        toast.success('Cover image removed');
      },
    });
  };

  return (
    <div className="relative h-32 bg-gradient-to-br from-brand-600 to-brand-700 sm:h-40">
      {business.cover_url && <img src={business.cover_url} alt="" className="size-full object-cover" />}

      {canEdit && (
        <>
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              title={`PNG, JPEG or WebP, up to ${formatBytes(MAX_ASSET_BYTES)}. A wide image (about 1600 × 400) works best.`}
              className={overlayButtonClass}
            >
              {replaceMutation.isPending ? (
                <Spinner size="sm" label={null} />
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.66-.9l.82-1.2A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {business.cover_url ? 'Change cover' : 'Add cover'}
            </button>
            {business.cover_asset_id && (
              <button type="button" onClick={() => setConfirmingRemove(true)} disabled={isBusy} className={overlayButtonClass}>
                Remove
              </button>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="absolute right-3 bottom-3 left-3 rounded-md bg-red-600/90 px-2.5 py-1.5 text-xs text-white sm:left-auto"
            >
              {error}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={handleFileChosen}
            className="hidden"
            aria-label="Choose a cover image"
          />

          <ConfirmDialog
            open={confirmingRemove}
            title="Remove cover image?"
            message="Your booking page will show a plain colour banner instead."
            confirmLabel="Remove cover"
            tone="danger"
            isPending={removeMutation.isPending}
            error={removeMutation.error}
            onConfirm={removeCover}
            onCancel={() => {
              setConfirmingRemove(false);
              removeMutation.reset();
            }}
          />
        </>
      )}
    </div>
  );
}
