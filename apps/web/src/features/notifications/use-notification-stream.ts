import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { readEventStream, type ServerSentEvent } from '@/lib/api/event-stream';
import { sendAuthenticated } from '@/lib/api/http-client';
import { NOTIFICATION_STREAM_PATH, type NotificationStreamEvent } from './api';
import { notificationsKeys } from './queries';

const FIRST_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Keeps the notification queries live while the signed-in app is open: new notifications pop
 * up as a toast and update the bell, and reads made in other tabs or devices clear it.
 *
 * Connected only while the tab is visible. Browsers allow few open connections per server
 * (6 over HTTP/1.1), so tabs in the background let theirs go; on coming back, the reconnect
 * refetches whatever arrived meanwhile.
 *
 * The API ends the stream when the access token expires; reconnecting then refreshes the
 * session like any other request.
 */
export function useNotificationStream(): void {
  const queryClient = useQueryClient();
  const toast = useToast();
  // A notification can be announced twice (a retried delivery); toast it once.
  const toasted = useRef(new Set<string>());

  useEffect(() => {
    let controller: AbortController | null = null;
    let retryTimer: number | undefined;
    let retryDelay = FIRST_RETRY_DELAY_MS;

    const refresh = () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all });

    const handleEvent = ({ type, data }: ServerSentEvent) => {
      if (type === 'ready') {
        retryDelay = FIRST_RETRY_DELAY_MS;
        // Catch up on anything sent while disconnected.
        void refresh();
        return;
      }
      if (type !== 'notification.created' && type !== 'notification.read') return;

      const event = JSON.parse(data) as NotificationStreamEvent;
      void refresh();
      if (event.type === 'notification.created' && !toasted.current.has(event.notification.id)) {
        toasted.current.add(event.notification.id);
        toast.info(`${event.notification.title}: ${event.notification.body}`);
      }
    };

    const connect = async () => {
      const current = new AbortController();
      controller = current;
      try {
        const response = await sendAuthenticated(NOTIFICATION_STREAM_PATH, {
          signal: current.signal,
        });
        // The session is gone and has been expired, which signs the user out.
        if (response.status === 401) return;
        if (!response.ok || !response.body) throw new Error(`Stream refused (${response.status})`);
        await readEventStream(response.body, handleEvent);
        // Ended by the server (token expiry, deploy): reconnect straight away.
        retryDelay = FIRST_RETRY_DELAY_MS;
        scheduleConnect(0);
      } catch {
        if (current.signal.aborted) return;
        scheduleConnect(retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
      }
    };

    const scheduleConnect = (delayMs: number) => {
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => void connect(), delayMs);
    };

    const disconnect = () => {
      window.clearTimeout(retryTimer);
      controller?.abort();
      controller = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!controller) {
          retryDelay = FIRST_RETRY_DELAY_MS;
          void connect();
        }
      } else {
        disconnect();
      }
    };

    if (document.visibilityState === 'visible') void connect();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect();
    };
  }, [queryClient, toast]);
}
