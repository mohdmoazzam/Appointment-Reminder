import { useEffect } from 'react';

const APP_NAME = 'ShowUp';

/** Sets the browser tab title to "<title> · ShowUp" while the page is shown. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);
}
