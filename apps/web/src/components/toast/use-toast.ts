import { useContext, useMemo } from 'react';
import { getErrorMessage } from '@/lib/api/api-error';
import { ToastContext } from './toast-context';

/** toast.success('Saved'), toast.error(error) – error accepts anything thrown. */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');

  const { showToast } = context;
  return useMemo(
    () => ({
      success: (message: string) => showToast(message, 'success'),
      info: (message: string) => showToast(message, 'info'),
      error: (error: unknown) => showToast(getErrorMessage(error), 'error'),
    }),
    [showToast],
  );
}
