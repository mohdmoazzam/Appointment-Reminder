const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** "IN" → "India". Null for codes that aren't two letters or that the browser doesn't know. */
export function countryName(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  try {
    const name = regionNames.of(normalized);
    // Unknown codes come back unchanged.
    return name && name !== normalized ? name : null;
  } catch {
    return null;
  }
}
