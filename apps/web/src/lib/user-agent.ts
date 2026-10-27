/*
 * A small, best-effort user-agent parser for labelling sessions ("Chrome on Windows"). Order
 * matters in both lists: Edge and Opera user agents also contain "Chrome", and Chrome's also
 * contains "Safari"; Android user agents also contain "Linux".
 */

const BROWSERS: { name: string; pattern: RegExp }[] = [
  { name: 'Edge', pattern: /Edg\// },
  { name: 'Opera', pattern: /OPR\/|Opera/ },
  { name: 'Samsung Internet', pattern: /SamsungBrowser/ },
  { name: 'Firefox', pattern: /Firefox\/|FxiOS/ },
  { name: 'Chrome', pattern: /Chrome\/|CriOS/ },
  { name: 'Safari', pattern: /Safari\// },
];

const OPERATING_SYSTEMS: { name: string; pattern: RegExp }[] = [
  { name: 'Android', pattern: /Android/ },
  { name: 'iOS', pattern: /iPhone|iPad|iPod/ },
  { name: 'Windows', pattern: /Windows/ },
  { name: 'macOS', pattern: /Macintosh|Mac OS X/ },
  { name: 'ChromeOS', pattern: /CrOS/ },
  { name: 'Linux', pattern: /Linux/ },
];

/** "Chrome on Windows", "Safari on iOS", or "Unknown device". */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';

  const browser = BROWSERS.find((b) => b.pattern.test(userAgent))?.name;
  const os = OPERATING_SYSTEMS.find((o) => o.pattern.test(userAgent))?.name;

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return 'Unknown device';
}
