const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes user-provided text (names, business names) before it goes into email HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
}

interface LayoutOptions {
  /** Preview text shown after the subject in most inboxes. */
  preheader: string;
  /** The rendered template body (trusted HTML; its placeholders are already escaped). */
  body: string;
}

/**
 * The shell every email is wrapped in. Table-based with inline styles, because many email
 * clients (Outlook, Gmail) ignore <style> blocks and modern layout.
 */
export function layout({ preheader, body }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b">
  <span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
        <tr><td style="padding:32px;font-size:15px;line-height:1.6">
          ${body}
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Sent by ShowUp</p>
    </td></tr>
  </table>
</body>
</html>`;
}
