import { useEffect } from 'react';

const APP_NAME = 'Appointment Reminder';

/** Sets the browser tab title to "<title> · Appointment Reminder" while the page is shown. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);
}
