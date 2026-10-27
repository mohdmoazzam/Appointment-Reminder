import { useRef, useState, type ChangeEvent } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  IMAGE_ACCEPT,
  MAX_ASSET_BYTES,
  formatBytes,
  validateImageFile,
} from '@/features/assets/validation';
import type { Business } from '@/types/models';
import { useRemoveLogo, useReplaceLogo } from '../queries';

interface BusinessLogoCardProps {
  business: Business;
  canEdit: boolean;
}

export function BusinessLogoCard({ business, canEdit }: BusinessLogoCardProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const replaceMutation = useReplaceLogo();
  const removeMutation = useRemoveLogo();
  const isBusy = replaceMutation.isPending || removeMutation.isPending;

  const handleFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file again still fires a change event.
    event.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    setFileError(validationError);
    if (validationError) return;

    replaceMutation.mutate(
      { file, previousAssetId: business.logo_asset_id },
      { onSuccess: () => toast.success('Logo updated') },
    );
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

  return (
    <Card>
      <CardHeader title="Logo" description="Shown in the app and on your booking page." />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={business.name} imageUrl={business.logo_url} size="lg" shape="rounded" />

          {canEdit ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={replaceMutation.isPending}
                  disabled={isBusy}
                >
                  {business.logo_url ? 'Replace logo' : 'Upload logo'}
                </Button>
                {business.logo_asset_id && (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmingRemove(true)}
                    disabled={isBusy}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                PNG, JPEG or WebP, up to {formatBytes(MAX_ASSET_BYTES)}. A square image works best.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={handleFileChosen}
                className="hidden"
                aria-label="Choose a logo image"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Only owners can change the logo.</p>
          )}
        </div>

        {fileError && <Alert tone="error">{fileError}</Alert>}
        <ErrorAlert error={replaceMutation.error} />
      </CardBody>

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
    </Card>
  );
}
