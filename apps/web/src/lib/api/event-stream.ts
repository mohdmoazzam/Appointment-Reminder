/** One server-sent event: its `event:` name (default "message") and its `data:` lines joined. */
export interface ServerSentEvent {
  type: string;
  data: string;
}

/**
 * Reads a text/event-stream body, calling onEvent for each event, until the server ends the
 * stream (resolves) or the request is aborted (rejects with an AbortError).
 *
 * The bare minimum of the spec this API uses: "\n" line endings, `event:` and `data:` fields;
 * comments, `id:` and `retry:` are ignored.
 */
export async function readEventStream(body: ReadableStream<Uint8Array>, onEvent: (event: ServerSentEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    // `stream: true` keeps a character split across chunks intact.
    buffer += decoder.decode(value, { stream: true });

    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const event = parseEvent(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      if (event) onEvent(event);
    }
  }
}

function parseEvent(block: string): ServerSentEvent | null {
  let type: string | null = null;
  const data: string[] = [];
  for (const line of block.split('\n')) {
    const colon = line.indexOf(':');
    // A line starting with ":" is a comment.
    if (colon === 0) continue;
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') type = value;
    else if (field === 'data') data.push(value);
  }
  // Only comments (or unknown fields): nothing to dispatch.
  if (type === null && data.length === 0) return null;
  return { type: type || 'message', data: data.join('\n') };
}
