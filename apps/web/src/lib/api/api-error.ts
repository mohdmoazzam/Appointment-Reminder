/** Body of a NestJS error response. `message` is an array for validation errors. */
interface NestErrorBody {
  statusCode?: number;
  message?: unknown;
  error?: string;
}

/** Status used for requests that never got a response (offline, DNS, CORS, server down). */
const NETWORK_ERROR_STATUS = 0;

const MESSAGES = {
  network: "Can't reach the server. Check your connection and try again.",
  forbidden: "You don't have permission to do that.",
  tooManyRequests: 'Too many attempts. Please wait a minute and try again.',
  server: 'Something went wrong on our side. Please try again.',
  unknown: 'Something went wrong. Please try again.',
} as const;

/** The text Nest's guards use when a role check fails; not worth showing as-is. */
const NEST_DEFAULT_FORBIDDEN = 'Forbidden resource';

/** Every failed API call rejects with an ApiError. */
export class ApiError extends Error {
  /** HTTP status code, or 0 when the request never reached the server. */
  readonly status: number;
  /** All messages from the server; validation errors can carry several. */
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    const safeMessages = messages.length > 0 ? messages : [MESSAGES.unknown];
    super(safeMessages[0]);
    this.name = 'ApiError';
    this.status = status;
    this.messages = safeMessages;
  }

  static network(): ApiError {
    return new ApiError(NETWORK_ERROR_STATUS, [MESSAGES.network]);
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body = await readErrorBody(response);
    const serverMessages = toMessages(body?.message);
    const friendly = friendlyMessage(response.status, serverMessages);
    if (friendly) return new ApiError(response.status, [friendly]);
    if (serverMessages.length > 0) return new ApiError(response.status, serverMessages);
    return new ApiError(response.status, [response.statusText || MESSAGES.unknown]);
  }

  get isNetworkError(): boolean {
    return this.status === NETWORK_ERROR_STATUS;
  }

  /** 4xx: retrying the same request won't help. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * Replaces messages written for developers (throttler text, 5xx details, Nest's default 403)
 * with ones written for users. Returns null to keep the server's messages.
 */
function friendlyMessage(status: number, serverMessages: string[]): string | null {
  if (status === 429) return MESSAGES.tooManyRequests;
  if (status >= 500) return MESSAGES.server;
  if (
    status === 403 &&
    (serverMessages.length === 0 || serverMessages[0] === NEST_DEFAULT_FORBIDDEN)
  ) {
    return MESSAGES.forbidden;
  }
  return null;
}

function toMessages(message: unknown): string[] {
  if (typeof message === 'string') return [message];
  if (Array.isArray(message)) return message.filter((m): m is string => typeof m === 'string');
  return [];
}

async function readErrorBody(response: Response): Promise<NestErrorBody | null> {
  try {
    return (await response.json()) as NestErrorBody;
  } catch {
    // Not JSON (e.g. an HTML error page from a proxy).
    return null;
  }
}

/** Turns anything thrown into messages that can be shown to the user. */
export function getErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError) return error.messages;
  if (error instanceof Error && error.message) return [error.message];
  return [MESSAGES.unknown];
}

export function getErrorMessage(error: unknown): string {
  return getErrorMessages(error).join(' ');
}

export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}
