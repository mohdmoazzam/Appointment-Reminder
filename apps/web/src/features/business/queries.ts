import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { deleteAsset, uploadAsset } from '@/features/assets/api';
import { usersKeys } from '@/features/users/queries';
import type { CurrentUser } from '@/features/users/types';
import type { Business } from '@/types/models';
import { getBusiness, updateBusiness } from './api';
import type { UpdateBusinessRequest } from './types';

export const businessKeys = {
  all: ['business'] as const,
  detail: () => [...businessKeys.all, 'detail'] as const,
};

export function useBusiness() {
  return useQuery({
    queryKey: businessKeys.detail(),
    queryFn: getBusiness,
  });
}

/**
 * The business also lives in the current-user query (the layout shows its name and logo), so
 * both caches are updated with the saved version.
 */
function storeBusiness(queryClient: QueryClient, business: Business): void {
  queryClient.setQueryData(businessKeys.detail(), business);
  queryClient.setQueryData<CurrentUser>(usersKeys.me(), (current) => (current ? { ...current, business } : current));
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateBusinessRequest) => updateBusiness(request),
    onSuccess: (business) => storeBusiness(queryClient, business),
  });
}

/** The business's images, by the field that points at their asset. */
export type BusinessImageField = 'logo_asset_id' | 'cover_asset_id';

interface ReplaceImageInput {
  file: File;
  /** The current image's asset, deleted once the new one is in place. */
  previousAssetId: string | null;
}

/** Uploads an image, makes it the logo (or cover), then deletes the old file. */
export function useReplaceBusinessImage(field: BusinessImageField) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, previousAssetId }: ReplaceImageInput) => {
      const asset = await uploadAsset(file);

      let business: Business;
      try {
        business = await updateBusiness({ [field]: asset.id });
      } catch (error) {
        // Don't leave the just-uploaded file behind if it couldn't be set on the business.
        await deleteAsset(asset.id).catch(() => undefined);
        throw error;
      }

      if (previousAssetId) {
        // The new image is already saved; failing to delete the old file shouldn't fail the
        // change, it only leaves an unused file in storage.
        await deleteAsset(previousAssetId).catch(() => undefined);
      }
      return business;
    },
    onSuccess: (business) => storeBusiness(queryClient, business),
  });
}

/**
 * Deleting a logo's or cover's asset also clears it on the business (the API's foreign key
 * does it).
 */
export function useRemoveBusinessImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: businessKeys.all }),
        queryClient.invalidateQueries({ queryKey: usersKeys.me(), exact: true }),
      ]),
  });
}
