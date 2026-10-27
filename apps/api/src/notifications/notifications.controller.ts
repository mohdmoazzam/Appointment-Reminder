import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Sse, type MessageEvent } from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { interval, map, merge, of, takeUntil, timer, type Observable } from 'rxjs';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { ListNotificationsDto } from '../common/dtos/notifications.dto.js';
import { Helper } from '../common/helper.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { NotificationStreamService } from './notification-stream.service.js';

/** Keeps idle streams from being cut by proxies and load balancers (most time out after 60s). */
const STREAM_HEARTBEAT_MS = 25_000;

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController extends ProtectedController {
  constructor(
    private readonly inApp: InAppNotificationsService,
    private readonly stream: NotificationStreamService,
  ) {
    super();
  }

  /** The signed-in user's in-app notifications, newest first by default. */
  @Get()
  list(@CurrentUser() auth: AuthUser, @Query() query: ListNotificationsDto) {
    return this.inApp.list(auth, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() auth: AuthUser) {
    return this.inApp.unreadCount(auth);
  }

  /**
   * Server-sent events: `ready` once connected, then `notification.created` and
   * `notification.read` (JSON data, see NotificationStreamEvent), and a `ping` every 25s.
   *
   * The stream ends when the access token expires, so a revoked session stops receiving;
   * reconnect with a fresh token (and refetch the list, in case something arrived meanwhile).
   */
  @Sse('stream')
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ description: 'An event stream' })
  events(@CurrentUser() auth: AuthUser): Observable<MessageEvent> {
    const events = this.stream.eventsFor(auth).pipe(map((event): MessageEvent => ({ type: event.type, data: event })));
    const heartbeat = interval(STREAM_HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' })));
    return merge(of<MessageEvent>({ type: 'ready', data: '' }), events, heartbeat).pipe(
      takeUntil(timer(Helper.msUntil(auth.token_expires_at))),
    );
  }

  @Post('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() auth: AuthUser) {
    return this.inApp.markAllRead(auth);
  }

  @Post(':notification_id/read')
  @HttpCode(200)
  markRead(@CurrentUser() auth: AuthUser, @Param('notification_id', ParseUUIDPipe) notification_id: string) {
    return this.inApp.markRead(auth, notification_id);
  }
}
