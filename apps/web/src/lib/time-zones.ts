/** The browser's IANA time zone, e.g. "Asia/Kolkata". Falls back to UTC if unavailable. */
export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * All IANA time zones the browser knows, for a <select>. `selected` is added if missing, since
 * a value saved from another browser can be an alias this one doesn't list (e.g. Asia/Calcutta).
 */
export function getTimeZoneOptions(selected?: string): { value: string; label: string }[] {
  const zones = new Set(Intl.supportedValuesOf('timeZone'));
  zones.add('UTC');
  if (selected) zones.add(selected);

  return [...zones]
    .sort((a, b) => a.localeCompare(b))
    .map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }));
}
