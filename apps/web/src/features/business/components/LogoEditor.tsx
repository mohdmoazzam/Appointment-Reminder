import { useRef, useState, type ChangeEvent } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { IMAGE_ACCEPT, MAX_ASSET_BYTES, formatBytes, validateImageFile } from '@/features/assets/validation';
import { getErrorMessage } from '@/lib/api/api-error';
import type { Business } from '@/types/models';
import { useRemoveBusinessImage, useReplaceBusinessImage } from '../queries';

interface LogoEditorProps {
  business: Business;
  /** Owners can upload and remove; everyone else just sees the logo. */
  canEdit: boolean;
}

/** The business logo; owners click it to upload a new one. */
export function LogoEditor({ business, canEdit }: LogoEditorProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const replaceMutation = useReplaceBusinessImage('logo_asset_id');
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

    replaceMutation.mutate({ file, previousAssetId: business.logo_asset_id }, { onSuccess: () => toast.success('Logo updated') });
  };

  const removeLogo = () => {
    if (!business.logo_asset_id) return;
    removeMutation.mutate(business.logo_asset_id, {
      onSuccess: () => {
        setConfirmingRemove(false);
        toast.success('Logo removed');
      },
    });
  };

  if (!canEdit) {
    return <Avatar name={business.name} imageUrl={business.logo_url} size="lg" shape="rounded" />;
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isBusy}
        title={`PNG, JPEG or WebP, up to ${formatBytes(MAX_ASSET_BYTES)}`}
        aria-label={business.logo_url ? 'Change logo' : 'Upload a logo'}
        className="group relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <Avatar name={business.name} imageUrl={business.logo_url} size="lg" shape="rounded" />
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {isBusy ? (
            <Spinner size="sm" label={null} />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.66-.9l.82-1.2A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </button>
      {business.logo_asset_id && (
        <button
          type="button"
          onClick={() => setConfirmingRemove(true)}
          disabled={isBusy}
          className="text-xs font-medium text-slate-500 hover:text-red-600"
        >
          Remove
        </button>
      )}
      {error && (
        <p role="alert" className="max-w-40 text-center text-xs text-red-600">
          {error}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleFileChosen}
        className="hidden"
        aria-label="Choose a logo image"
      />

      <ConfirmDialog
        open={confirmingRemove}
        title="Remove logo?"
        message="Your business will show its initials instead until you upload a new logo."
        confirmLabel="Remove logo"
        tone="danger"
        isPending={removeMutation.isPending}
        error={removeMutation.error}
        onConfirm={removeLogo}
        onCancel={() => {
          setConfirmingRemove(false);
          removeMutation.reset();
        }}
      />
    </div>
  );
}
